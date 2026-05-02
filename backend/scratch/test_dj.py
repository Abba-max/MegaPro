import dj_database_url
try:
    dj_database_url.parse("://")
except Exception as e:
    print(f"Error with '://': {e}")

try:
    dj_database_url.parse("postgresql://")
except Exception as e:
    print(f"Error with 'postgresql://': {e}")
