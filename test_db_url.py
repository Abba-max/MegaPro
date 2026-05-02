import dj_database_url
for s in ['://', ' ://', '://://', 'postgres://', 'postgresql://', '"postgresql://"']:
    try:
        dj_database_url.parse(s)
    except dj_database_url.UnknownSchemeError as e:
        print(repr(s), '->', e)
