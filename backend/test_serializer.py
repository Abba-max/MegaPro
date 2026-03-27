from apps.estate_app.serializers import EstateSerializer
data = {
    "name": "Test Estate",
    "location": "Yaounde",
    "distance": 500,
    "status": "published",
    "description": "My beautiful home",
    "restaurant": "0",
    "generator": "0",
    "forage": "0"
}
serializer = EstateSerializer(data=data)
if not serializer.is_valid():
    print("VALIDATION ERRORS:")
    print(serializer.errors)
else:
    print("VALID!")
