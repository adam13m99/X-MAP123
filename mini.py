import requests
import pandas as pd
import logging
import threading
import concurrent.futures
from typing import Optional
from dataclasses import dataclass
from config import METABASE_URL, METABASE_USERNAME, METABASE_PASSWORD

# --- Configuration & Setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class MetabaseConfig:
    """Configuration for Metabase connection"""
    url: str
    username: str
    password: str
    database_name: str
    database_id: Optional[int] = None

    @classmethod
    def create_with_team_db(cls, url: str, username: str, password: str, team: str):
        """Creates config with a team-specific database name for convenience."""
        team_databases = {
            'growth': 'Growth Team Clickhouse Connection',
            'data': 'Data Team Clickhouse Connection',
            'product': 'Product Team Clickhouse Connection'
        }
        if team.lower() not in team_databases:
            raise ValueError(f"Invalid team. Choose from: {list(team_databases.keys())}")
        
        return cls(
            url=url,
            username=username,
            password=password,
            database_name=team_databases[team.lower()]
        )

# --- Core Metabase Client ---
class MetabaseClient:
    """An optimized client for interacting with the Metabase API."""

    def __init__(self, config: MetabaseConfig):
        self.config = config
        self.session = requests.Session()
        self.session_token = None
        self.database_id = config.database_id
        self._last_auth_time = None
        self._session_timeout = 3600  # 1 hour session timeout (adjustable)
    
    def _is_session_valid(self) -> bool:
        """Check if the current session is still valid."""
        if not self.session_token or not self._last_auth_time:
            return False

        # Check if session has timed out
        import time
        if time.time() - self._last_auth_time > self._session_timeout:
            return False

        # Test session with a lightweight API call
        try:
            response = self.session.get(f"{self.config.url}/api/user/current", timeout=10)
            return response.status_code == 200
        except:
            return False

    def authenticate(self) -> bool:
        """Authenticate with Metabase and store the session token."""
        try:
            auth_url = f"{self.config.url}/api/session"
            auth_data = {"username": self.config.username, "password": self.config.password}
            response = self.session.post(auth_url, json=auth_data, timeout=30)
            response.raise_for_status()

            self.session_token = response.json().get('id')
            self.session.headers.update({'X-Metabase-Session': self.session_token})

            import time
            self._last_auth_time = time.time()

            logger.info("Successfully authenticated with Metabase.")
            return True

        except requests.exceptions.RequestException as e:
            logger.error(f"Authentication failed: {e}")
            return False

    def ensure_authenticated(self) -> bool:
        """Ensure we have a valid session, re-authenticating if necessary."""
        if self._is_session_valid():
            return True

        logger.info("Session invalid or expired, re-authenticating...")
        return self.authenticate()
    
    def get_database_id(self) -> Optional[int]:
        """Find the database ID using its name."""
        if self.database_id:
            return self.database_id

        if not self.ensure_authenticated():
            return None

        try:
            databases_url = f"{self.config.url}/api/database"
            response = self.session.get(databases_url)
            response.raise_for_status()
            
            databases = response.json().get('data', [])
            for db in databases:
                if db.get('name') == self.config.database_name:
                    self.database_id = db.get('id')
                    logger.info(f"Found database ID: {self.database_id} for '{self.config.database_name}'")
                    return self.database_id
            
            logger.error(f"Database '{self.config.database_name}' not found.")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get database ID: {e}")
            return None

    def execute_query(self, sql_query: str, timeout: int = 300, max_results: int = 100000) -> Optional[pd.DataFrame]:
        """Execute a single, raw SQL query. Ensures authentication before execution."""
        if not self.ensure_authenticated():
            return None

        try:
            query_payload = {
                "type": "native",
                "native": {"query": sql_query},
                "database": self.database_id,
                "constraints": {"max-results": max_results, "max-results-bare-rows": max_results}
            }
            
            query_url = f"{self.config.url}/api/dataset"
            response = self.session.post(query_url, json=query_payload, timeout=timeout)
            response.raise_for_status()
            
            result = response.json()
            if result.get('status') != 'completed':
                logger.error(f"Query failed. Status: {result.get('status')}. Error: {result.get('error')}")
                return None
            
            data = result.get('data', {})
            rows = data.get('rows', [])
            columns = [col['name'] for col in data.get('cols', [])]
            return pd.DataFrame(rows, columns=columns)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Query execution failed: {e}")
            return None
            
    def execute_query_with_parallel_pagination(self, sql_query: str, page_size: int = 50000, max_workers: int = 8) -> Optional[pd.DataFrame]: # CHANGED: Increased default workers
        """Fetch all results for a query using an OPTIMIZED parallel pagination method."""
        logger.info(f"🚀 Executing with OPTIMIZED parallel pagination ({max_workers} workers)...")

        if not self.ensure_authenticated():
            return None

        # We need the database_id for the count query.
        if not self.database_id and not self.get_database_id():
            return None

        # 1. Get total row count to calculate pages
        count_query = f"SELECT COUNT(*) as total_rows FROM ({sql_query.rstrip(';')}) as subquery"
        count_df = self.execute_query(count_query)
        if count_df is None or count_df.empty:
            logger.error("Failed to get total row count. Cannot proceed with parallel fetch.")
            return None
            
        total_rows = count_df.iloc[0]['total_rows']
        if total_rows == 0:
            logger.info("Query returned 0 rows.")
            return pd.DataFrame()
        
        total_pages = (total_rows + page_size - 1) // page_size
        logger.info(f"📊 Total rows: {total_rows:,}, Pages: {total_pages}, Page size: {page_size:,}")
        
        # CHANGED: The worker function now accepts the session token and db_id to prevent re-authentication.
        def fetch_page(page_num: int, session_token: str, db_id: int) -> Optional[pd.DataFrame]:
            """Fetch a single page of data using pre-authenticated credentials."""
            try:
                # Use a new session for thread safety, but with the existing token.
                with requests.Session() as thread_session:
                    thread_session.headers.update({'X-Metabase-Session': session_token})
                    
                    offset = page_num * page_size
                    paginated_query = f"{sql_query.rstrip(';')} LIMIT {page_size} OFFSET {offset}"
                    
                    query_payload = {
                        "type": "native",
                        "native": {"query": paginated_query},
                        "database": db_id,
                        "constraints": {"max-results": page_size, "max-results-bare-rows": page_size}
                    }

                    query_url = f"{self.config.url}/api/dataset"
                    response = thread_session.post(query_url, json=query_payload, timeout=300)
                    response.raise_for_status()

                    result = response.json()
                    data = result.get('data', {})
                    rows = data.get('rows', [])
                    columns = [col['name'] for col in data.get('cols', [])]
                    df = pd.DataFrame(rows, columns=columns)

                    logger.info(f"✅ Page {page_num + 1}/{total_pages} fetched ({len(df):,} rows)")
                    return df
            except Exception as e:
                logger.error(f"Error fetching page {page_num + 1}: {e}")
            return None

        # 2. Execute all page fetches in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # CHANGED: Pass the token and db_id to each worker.
            futures = [executor.submit(fetch_page, i, self.session_token, self.database_id) for i in range(total_pages)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]

        # 3. Combine results
        valid_dataframes = [df for df in results if df is not None]
        if not valid_dataframes:
            logger.error("No data retrieved from any page.")
            return None
            
        final_df = pd.concat(valid_dataframes, ignore_index=True)
        logger.info(f"🎉 Parallel fetch complete. Total rows retrieved: {len(final_df):,}")
        
        if len(final_df) != total_rows:
            logger.warning(f"⚠️ Mismatch in row count! Expected {total_rows}, got {len(final_df)}. Some pages may have failed.")
            
        return final_df

    def get_question_details(self, question_id: int) -> Optional[dict]:
        """Retrieve the details (including the SQL) of a saved question."""
        if not self.ensure_authenticated():
            return None

        try:
            url = f"{self.config.url}/api/card/{question_id}"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get details for question {question_id}: {e}")
            return None

    def logout(self):
        """Log out from the Metabase session."""
        if self.session_token:
            try:
                self.session.delete(f"{self.config.url}/api/session")
                logger.info("Successfully logged out.")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Logout failed: {e}")
            finally:
                self.session_token = None
                self._last_auth_time = None

    def close(self):
        """Close the session and clean up resources."""
        self.logout()
        self.session.close()


# --- Singleton Pattern for Persistent Sessions ---
class MetabaseSingleton:
    """Singleton manager for MetabaseClient instances to enable persistent sessions."""
    _instances = {}
    _lock = threading.Lock()

    @classmethod
    def get_client(cls, config: MetabaseConfig) -> MetabaseClient:
        """Get or create a MetabaseClient instance for the given config."""
        # Create a unique key based on config
        config_key = f"{config.url}_{config.username}_{config.database_name}"

        with cls._lock:
            if config_key not in cls._instances:
                cls._instances[config_key] = MetabaseClient(config)
                logger.info(f"Created new persistent MetabaseClient for {config.database_name}")
            return cls._instances[config_key]

    @classmethod
    def close_all_clients(cls):
        """Close all client sessions and clear the instance cache."""
        with cls._lock:
            for client in cls._instances.values():
                client.close()
            cls._instances.clear()
            logger.info("All MetabaseClient sessions have been closed.")

# --- Main High-Level Function ---

def fetch_question_data(
    question_id: int,
    metabase_url: str,
    username: str,
    password: str,
    team: str = "growth",
    workers: int = 8,
    page_size: int = 50000
) -> Optional[pd.DataFrame]:
    """
    Fetches all data for a given Metabase saved question using OPTIMIZED parallel processing.
    Now uses persistent sessions to avoid repeated login/logout cycles.
    """
    logger.info(f"🚀 Starting optimized fetch for Metabase question ID: {question_id}")
    config = MetabaseConfig.create_with_team_db(url=metabase_url, username=username, password=password, team=team)

    # Use singleton pattern to get persistent client
    client = MetabaseSingleton.get_client(config)

    try:
        # Client will auto-authenticate if needed via ensure_authenticated()
        details = client.get_question_details(question_id)
        if not details: return None

        native_query_data = details.get('dataset_query', {}).get('native')
        if not native_query_data or 'query' not in native_query_data:
            logger.error(f"Question {question_id} is not a native SQL query. Cannot extract SQL.")
            return None

        sql_query = native_query_data['query']
        logger.info(f"Successfully extracted SQL from question '{details.get('name', 'N/A')}'.")

        return client.execute_query_with_parallel_pagination(sql_query, page_size=page_size, max_workers=workers)

    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
        return None
    # Note: No longer calling client.logout() - session remains persistent


# --- Session Management Utilities ---

def close_all_metabase_sessions():
    """
    Utility function to close all persistent Metabase sessions.
    Call this when shutting down the application or when you want to force re-authentication.
    """
    MetabaseSingleton.close_all_clients()


def get_session_status() -> dict:
    """
    Get the status of all active Metabase sessions.
    Returns a dictionary with session information for debugging.
    """
    with MetabaseSingleton._lock:
        sessions = {}
        for key, client in MetabaseSingleton._instances.items():
            sessions[key] = {
                'has_token': bool(client.session_token),
                'last_auth_time': client._last_auth_time,
                'database_id': client.database_id,
                'is_valid': client._is_session_valid() if client.session_token else False
            }
        return sessions


def force_reauthenticate_all():
    """
    Force re-authentication for all existing sessions.
    Useful if you suspect authentication issues.
    """
    with MetabaseSingleton._lock:
        for client in MetabaseSingleton._instances.values():
            client.session_token = None
            client._last_auth_time = None
    logger.info("Forced re-authentication for all sessions.")
