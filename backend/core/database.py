import logging
import mysql.connector
from mysql.connector import pooling
from core.config import settings

# Initialize MySQL connection pool
try:
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="mypool",
        pool_size=10,
        pool_reset_session=True,
        host=settings.DB_HOST,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_DATABASE
    )
except Exception as e:
    logging.error(f"Error creating connection pool: {e}")
    # Fallback to single connection configuration if pool creation fails (e.g. DB not present during build)
    db_pool = None

def get_db_cursor():
    """
    Acquires a connection from the pool and returns connection and cursor.
    """
    if db_pool:
        conn = db_pool.get_connection()
    else:
        conn = mysql.connector.connect(
            host=settings.DB_HOST,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_DATABASE
        )
    cursor = conn.cursor()
    return conn, cursor

def startup_db_init():
    conn = None
    cursor = None
    try:
        conn, cursor = get_db_cursor()
        
        # Create custom_topics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_topics (
                name VARCHAR(255) PRIMARY KEY
            )
        """)
        # Create custom_roles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_roles (
                name VARCHAR(255) PRIMARY KEY
            )
        """)
        # Create topic_role_mapping table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS topic_role_mapping (
                topic_name VARCHAR(255),
                role_name VARCHAR(255),
                PRIMARY KEY (topic_name, role_name)
            )
        """)
        conn.commit()
        
        # Populate default topics if empty
        cursor.execute("SELECT COUNT(*) FROM custom_topics")
        if cursor.fetchone()[0] == 0:
            default_topics = [
                'Python', 'Databases', 'ML', 'Deep Learning', 'Transformers & LLMs',
                'Prompt Engineering', 'Embeddings', 'Vector Databases', 'RAG',
                'LangChain', 'LangGraph', 'MCP', 'AI Agents', 'FastAPI', 'Real Projects'
            ]
            cursor.executemany(
                "INSERT INTO custom_topics (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name",
                [(t,) for t in default_topics]
            )
            conn.commit()
            
        # Populate default roles if empty
        cursor.execute("SELECT COUNT(*) FROM custom_roles")
        if cursor.fetchone()[0] == 0:
            default_roles = [
                'AI Engineer', 'AI Developer', 'AI/ML Engineer'
            ]
            cursor.executemany(
                "INSERT INTO custom_roles (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name",
                [(r,) for r in default_roles]
            )
            conn.commit()

        # Populate default mappings if empty
        cursor.execute("SELECT COUNT(*) FROM topic_role_mapping")
        if cursor.fetchone()[0] == 0:
            default_mappings = [
                ('Python', 'AI Engineer'), ('Python', 'AI Developer'), ('Python', 'AI/ML Engineer'),
                ('Databases', 'AI Engineer'), ('Databases', 'AI Developer'), ('Databases', 'AI/ML Engineer'),
                ('ML', 'AI Engineer'), ('ML', 'AI/ML Engineer'),
                ('Deep Learning', 'AI Engineer'), ('Deep Learning', 'AI/ML Engineer'),
                ('Transformers & LLMs', 'AI Engineer'), ('Transformers & LLMs', 'AI Developer'), ('Transformers & LLMs', 'AI/ML Engineer'),
                ('Prompt Engineering', 'AI Developer'), ('Prompt Engineering', 'AI Engineer'),
                ('Embeddings', 'AI Engineer'), ('Embeddings', 'AI/ML Engineer'),
                ('Vector Databases', 'AI Engineer'), ('Vector Databases', 'AI/ML Engineer'),
                ('RAG', 'AI Engineer'), ('RAG', 'AI Developer'), ('RAG', 'AI/ML Engineer'),
                ('LangChain', 'AI Engineer'), ('LangChain', 'AI Developer'),
                ('LangGraph', 'AI Engineer'), ('LangGraph', 'AI Developer'),
                ('MCP', 'AI Engineer'), ('MCP', 'AI Developer'),
                ('AI Agents', 'AI Engineer'), ('AI Agents', 'AI Developer'), ('AI Agents', 'AI/ML Engineer'),
                ('FastAPI', 'AI Developer'),
                ('Real Projects', 'AI Engineer'), ('Real Projects', 'AI Developer'), ('Real Projects', 'AI/ML Engineer'),
            ]
            cursor.executemany(
                "INSERT INTO topic_role_mapping (topic_name, role_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE topic_name=topic_name",
                default_mappings
            )
            conn.commit()
            
        logging.info("Successfully initialized dynamic tables and default options.")
    except Exception as e:
        logging.error(f"Error initializing custom tables: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
