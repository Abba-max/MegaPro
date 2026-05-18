import os
import sys
import django

# Add backend directory to sys.path
backend_path = r"c:\Users\UsER\Documents\Django Tutorial\Django\EyangEstate\backend"
if backend_path not in sys.path:
    sys.path.append(backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from apps.estate_app.models import (
    Estate, EstateImage, RoomCategory, RoomImage, 
    Characteristic, EstateCharacteristic, Supplement
)

User = get_user_model()

print("Starting Database Seed...")

# 1. Create Admin
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'eyangestate@gmail.com',
        'password': make_password('adminpassword123'),
        'user_type': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'is_verified': True
    }
)
if not created:
    admin_user.email = 'eyangestate@gmail.com'
    admin_user.password = make_password('adminpassword123')
    admin_user.user_type = 'admin'
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.is_verified = True
    admin_user.save()
print(f"Admin Account: admin / adminpassword123 (Created: {created})")

# 2. Create Owner
owner_user, created = User.objects.get_or_create(
    username='testowner',
    defaults={
        'email': 'owner@eyangestate.com',
        'password': make_password('testpassword123'),
        'user_type': 'owner',
        'is_verified': True
    }
)
if not created:
    owner_user.email = 'owner@eyangestate.com'
    owner_user.password = make_password('testpassword123')
    owner_user.user_type = 'owner'
    owner_user.is_verified = True
    owner_user.save()
print(f"Owner Account: testowner / testpassword123 (Created: {created})")

# 3. Create Student
student_user, created = User.objects.get_or_create(
    username='teststudent',
    defaults={
        'email': 'student@eyangestate.com',
        'password': make_password('testpassword123'),
        'user_type': 'visitor',
        'visitor_category': '1',
        'is_verified': True
    }
)
if not created:
    student_user.email = 'student@eyangestate.com'
    student_user.password = make_password('testpassword123')
    student_user.user_type = 'visitor'
    student_user.visitor_category = '1'
    student_user.is_verified = True
    student_user.save()
print(f"Student Account: teststudent / testpassword123 (Created: {created})")

# 4. Create an Estate
estate, created = Estate.objects.get_or_create(
    name='Résidence Plein Ciel',
    defaults={
        'owner': owner_user,
        'location': 'Bastos, Yaoundé',
        'distance': 1.5,
        'description': 'Magnifique résidence sécurisée avec vue panoramique, parking spacieux, forage et groupe électrogène.',
        'wifi': True,
        'tv': True,
        'fridge': True,
        'parking': True,
        'security_guard': True,
        'cctv': True,
        'cleaning_service': True,
        'generator': '1',
        'generator_available': True,
        'forage': '1',
        'borehole_forage': True,
        'restaurant': '0',
        'status': 'published',
        'is_verified': True,
        'lat': 3.884041,
        'lng': 11.390736,
        'etages': 3,
        'water_bills': True,
        'electricity_bills': False,
        'fence': True,
        'caretaker': True,
        'allowed_gender': 'all',
        'max_capacity': 20
    }
)
if not created:
    estate.owner = owner_user
    estate.location = 'Bastos, Yaoundé'
    estate.distance = 1.5
    estate.description = 'Magnifique résidence sécurisée avec vue panoramique, parking spacieux, forage et groupe électrogène.'
    estate.wifi = True
    estate.tv = True
    estate.fridge = True
    estate.parking = True
    estate.security_guard = True
    estate.cctv = True
    estate.cleaning_service = True
    estate.generator = '1'
    estate.generator_available = True
    estate.forage = '1'
    estate.borehole_forage = True
    estate.restaurant = '0'
    estate.status = 'published'
    estate.is_verified = True
    estate.lat = 3.884041
    estate.lng = 11.390736
    estate.save()
print(f"Estate: Résidence Plein Ciel (Created: {created})")

# 5. Add Estate Images (Placeholders)
EstateImage.objects.filter(estate=estate).delete()
img1 = EstateImage.objects.create(estate=estate, image='estates/residence_plein_ciel_1.jpg')
img2 = EstateImage.objects.create(estate=estate, image='estates/residence_plein_ciel_2.jpg')
print("Added Estate Images placeholders.")

# 6. Add Room Categories
RoomCategory.objects.filter(estate=estate).delete()

rc1 = RoomCategory.objects.create(
    estate=estate,
    name='Chambre Standard',
    occupancy='single',
    price=50000,
    price_per_month=50000,
    total_rooms=5,
    available_rooms=5,
    quantity_available=5,
    surface_area=18.0,
    wifi=True,
    tv=False,
    fridge=False,
    room_size='2',
    description='Chambre standard confortable avec armoire, lit individuel et salle d\'eau privative.'
)

rc2 = RoomCategory.objects.create(
    estate=estate,
    name='Chambre Deluxe',
    occupancy='double',
    price=85000,
    price_per_month=85000,
    total_rooms=3,
    available_rooms=3,
    quantity_available=3,
    surface_area=28.0,
    wifi=True,
    tv=True,
    fridge=True,
    room_size='1',
    description='Grande chambre deluxe spacieuse avec lit double, climatisation, bureau et réfrigérateur.'
)
print("Added Room Categories (Chambre Standard & Deluxe).")

# 7. Add Room Images Placeholders
RoomImage.objects.create(room_category=rc1, image='rooms/standard_room.jpg', caption='Vue principale standard')
RoomImage.objects.create(room_category=rc2, image='rooms/deluxe_room.jpg', caption='Vue principale deluxe')
print("Added Room Images placeholders.")

# 8. Add Characteristics
Characteristic.objects.all().delete()
char_calme = Characteristic.objects.create(name='Calme et paisible', description='Zone résidentielle tranquille')
char_securise = Characteristic.objects.create(name='Sécurité H24', description='Gardien de nuit et caméras CCTV')
char_proche = Characteristic.objects.create(name='Proche Université', description='À 5 minutes à pied du campus')

EstateCharacteristic.objects.create(estate=estate, characteristic=char_calme)
EstateCharacteristic.objects.create(estate=estate, characteristic=char_securise)
print("Added Characteristics & Associations.")

# 9. Add Supplements
Supplement.objects.filter(estate=estate).delete()
Supplement.objects.create(estate=estate, name='Climatisation', price=10000, description='Option climatisateur mensuel', is_available=True, is_paid_service=True)
Supplement.objects.create(estate=estate, name='Ménage supplémentaire', price=5000, description='2 sessions de nettoyage par semaine', is_available=True, is_paid_service=True)
Supplement.objects.create(estate=estate, name='Petit déjeuner', price=15000, description='Livré chaque matin', is_available=True, is_paid_service=True)
print("Added Supplements.")

print("Database Seeding Completed Successfully!")
