from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('admin', 'Admin'),
        ('owner', 'Estate Owner'),
        ('parent', 'Parent'),
        ('student', 'Student'),
        ('visitor', 'Visitor/Student'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='visitor')
    contact = models.CharField(max_length=13, null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    address = models.CharField(max_length=50, null=True, blank=True)
    visitor_category = models.CharField(
        max_length=20, default="1",
        choices=(("1", "Student"), ("2", "Parent"), ("3", "Local resident"), ("4", "Visitor")),
        null=True, blank=True
    )
    is_verified = models.BooleanField(default=False)
    id_card = models.ImageField(upload_to='id_cards/', null=True, blank=True)

    class Meta(AbstractUser.Meta):
        db_table = 'auth_user'

    def __str__(self):
        return self.username


class Estate(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='estates', limit_choices_to={'user_type': 'owner'}
    )
    location    = models.CharField(max_length=255, default="Eyang")
    rating      = models.CharField(max_length=10, default="0.0")
    distance    = models.IntegerField(default=100)
    
    # ── New fields from MVP ──────────────────────────────────────────────────
    etages = models.PositiveIntegerField(verbose_name="nombre_d_etage", default=1)
    water_bills = models.BooleanField(default=False)       # False = Free, True = Paid
    electricity_bills = models.BooleanField(default=False) # False = Free, True = Paid
    fence = models.BooleanField(default=False)
    caretaker = models.BooleanField(default=False)
    security_guard = models.BooleanField(default=False)
    restaurant_on_site = models.BooleanField(default=False)
    borehole_forage = models.BooleanField(default=False)
    generator_available = models.BooleanField(default=False)
    parking = models.BooleanField(default=False)
    wifi = models.BooleanField(default=False)
    tv = models.BooleanField(default=False)
    fridge = models.BooleanField(default=False)
    cctv = models.BooleanField(default=False)
    cleaning_service = models.BooleanField(default=False)
    Terrain_de_sport = models.BooleanField(default=False)
    playground = models.BooleanField(default=False)
    allowed_gender = models.CharField(max_length=10, choices=(('all','All'),('male','Male'),('female','Female')), default='all')
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    # Extensible custom flags (key:value dict)
    custom_characteristics = models.JSONField(default=dict, blank=True)
    
    restaurant  = models.CharField(max_length=1, choices=(('1','Yes'),('0','No')), default='0')
    generator   = models.CharField(max_length=1, choices=(('1','Yes'),('0','No')), default='0')
    forage      = models.CharField(max_length=1, choices=(('1','Yes'),('0','No')), default='0')
    description = models.TextField(blank=True, default="")
    publishedAt = models.DateTimeField(auto_now=True)
    status      = models.CharField(
        max_length=20, default="published",
        choices=(("draft","Draft"),("published","Published"),("archived","Archived"))
    )
    # ── GPS coordinates ──────────────────────────────────────────────────────
    lat = models.DecimalField(max_digits=25, decimal_places=20, default=3.8840410)
    lng = models.DecimalField(max_digits=25, decimal_places=20, default=11.3907360)
    # ── Admin verification ───────────────────────────────────────────────────
    is_verified = models.BooleanField(
        default=False,
        help_text="Approved by an admin. Resets to False when owner edits the estate."
    )

    def __str__(self):
        return self.name


class RoomCategory(models.Model):
    estate = models.ForeignKey(Estate, related_name='room_categories', on_delete=models.CASCADE)
    name   = models.CharField(max_length=100)
    OCCUPANCY_CHOICES = (('single','Single Person'),('double','Two Persons'),('shared','Shared'))
    occupancy          = models.CharField(max_length=10, choices=OCCUPANCY_CHOICES, default='single')
    price              = models.IntegerField(default=300000)
    price_per_month    = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    # ── Room count tracking (concurrency-safe) ───────────────────────────────
    # total_rooms: how many physical rooms exist in this category.
    # available_rooms: how many are currently available for new reservations.
    # These are the canonical fields for availability management.
    total_rooms     = models.PositiveIntegerField(default=1, help_text="Total physical rooms in this category")
    available_rooms = models.IntegerField(default=1, db_index=True,
                      help_text="Rooms currently available. Decremented on accept, incremented on cancel/reject.")

    # ── Legacy / compatibility fields (keep for backward compat) ─────────────
    total_quantity     = models.PositiveIntegerField(default=1)
    available_quantity = models.IntegerField(default=1, db_index=True)
    dimensions         = models.CharField(max_length=50, blank=True, null=True)
    surface_area       = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
                         help_text="Room surface area in m²")
    quantity_available = models.IntegerField(default=1)
    occupied_count     = models.IntegerField(default=0)

    wifi      = models.BooleanField(default=False)
    tv        = models.BooleanField(default=False)
    fridge    = models.BooleanField(default=False)
    room_size = models.CharField(
        max_length=1, choices=(('1','Large'),('2','Medium'),('3','Small')), default='2'
    )
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.name} at {self.estate.name}"

    def save(self, *args, **kwargs):
        """On creation, initialise available_rooms from total_rooms if not set."""
        if self.pk is None and self.available_rooms == 1 and self.total_rooms > 1:
            self.available_rooms = self.total_rooms
        # Keep legacy fields in sync
        self.total_quantity = self.total_rooms
        self.available_quantity = self.available_rooms
        self.quantity_available = self.available_rooms
        super().save(*args, **kwargs)


class RoomImage(models.Model):
    room_category = models.ForeignKey(RoomCategory, related_name='images', on_delete=models.CASCADE)
    image   = models.ImageField(upload_to='estates/rooms/images/')
    caption = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Image for {self.room_category.name}"


class EstateImage(models.Model):
    estate = models.ForeignKey(Estate, related_name='images', on_delete=models.CASCADE)
    image  = models.ImageField(upload_to='estates/images/')

    def __str__(self):
        return f"Image for {self.estate.name}"


class Review(models.Model):
    estate     = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='reviews')
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='reviews')
    parent     = models.ForeignKey('self', null=True, blank=True,
                                   on_delete=models.CASCADE, related_name='replies')
    name       = models.CharField(max_length=100)
    rating     = models.IntegerField()
    comment    = models.TextField()
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    likes      = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_reviews', blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.name} on {self.estate}"


class QuickOrder(models.Model):
    STATUS_CHOICES = (
        ('pending_payment', 'Paiement en attente'),
        ('paid',            'Payée (en attente de validation)'), # ← NEW: receipt uploaded
        ('pending',         'En attente'),             # admin verified, waiting owner approval
        ('accepted',        'Acceptée'),
        ('rejected',        'Rejetée'),
        ('payment_failed',  'Paiement échoué'),
    )
    estate        = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='quick_orders')
    room_category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='quick_orders')
    user          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='quick_orders')
    name       = models.CharField(max_length=100)
    phone      = models.CharField(max_length=20)
    note       = models.TextField(blank=True)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')
    receipt    = models.ImageField(upload_to='receipts/', null=True, blank=True)
    is_payment_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order by {self.name} for {self.estate}"


class Payment(models.Model):
    STATUS_CHOICES = (
        ('initiated', 'Initiée'),
        ('success',   'Succès'),
        ('failed',    'Échouée'),
        ('cancelled', 'Annulée'),
    )
    order          = models.OneToOneField(
        QuickOrder, on_delete=models.CASCADE,
        related_name='payment', null=True, blank=True
    )
    user           = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payments'
    )
    transaction_id = models.CharField(max_length=100, unique=True)
    cinetpay_id    = models.CharField(max_length=100, blank=True, null=True)
    amount         = models.IntegerField(default=200)
    currency       = models.CharField(max_length=10, default='XAF')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    phone          = models.CharField(max_length=20, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    raw_notify     = models.JSONField(default=dict, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.status}"


class ContactRequest(models.Model):
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name='contact_requests')
    estate       = models.ForeignKey(Estate, on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name='contact_requests')
    name         = models.CharField(max_length=255)
    email        = models.EmailField()
    phone        = models.CharField(max_length=20)
    message      = models.TextField(default="")
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ContactRequest from {self.name}"


class Conversation(models.Model):
    client     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                    related_name='client_conversations')
    owner      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                    related_name='owner_conversations')
    estate     = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'owner', 'estate')
        ordering        = ['-updated_at']

    def __str__(self):
        return f"Conv: {self.client} ↔ {self.owner} ({self.estate})"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                      related_name='sent_messages')
    text       = models.TextField()
    read       = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg from {self.sender} in conv {self.conversation_id}"


class Notification(models.Model):
    TYPE_CHOICES = (
        ('new_message', 'New Message'),
        ('new_booking', 'New Booking'),
        ('new_review', 'New Review'),
        ('verification_status', 'Verification Status'),
        ('new_contact', 'New Contact'),
        ('info', 'Information'),
    )
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title_key  = models.CharField(max_length=255)  # i18n key
    body_key   = models.CharField(max_length=255)   # i18n key
    body_params = models.JSONField(default=dict, blank=True) # Params for translation interpolation
    link       = models.CharField(max_length=255, null=True, blank=True)
    read       = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.type}"


# ── New Models for Architecture ──────────────────────────────────────────────

class Characteristic(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name

class EstateCharacteristic(models.Model):
    estate = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='characteristics_set') # renamed related_name to avoid conflict with Estate.characteristics field if I add it, but wait, I already have characteristics field in Serializer.
    characteristic = models.ForeignKey(Characteristic, on_delete=models.CASCADE)
    
class Equipment(models.Model):
    part_name = models.CharField(max_length=100, unique=True)
    removable = models.BooleanField(default=False)

    def __str__(self):
        return self.part_name

class RoomEquipment(models.Model):
    CONDITION_CHOICES = (('NEW', 'New'), ('GOOD', 'Good'), ('BAD', 'Bad'))
    room_category = models.ForeignKey(RoomCategory, on_delete=models.CASCADE, related_name='equipment_set')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    surface_area_m2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, default='GOOD')
    note = models.TextField(blank=True, default='',
            help_text="Optional note about this equipment item (e.g., 'shared between 2 rooms')")

class Supplement(models.Model):
    estate = models.ForeignKey(Estate, on_delete=models.CASCADE, related_name='supplements_set')
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_available = models.BooleanField(default=True)
    is_paid_service = models.BooleanField(default=False,
                      help_text="True if this supplement has a cost, False if included.")
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_supplements'
    )

    def __str__(self):
        return f"{self.name} - {self.price}"

class Room(models.Model):
    category = models.ForeignKey(RoomCategory, on_delete=models.CASCADE, related_name='physical_rooms')
    room_number = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=(('AVAILABLE', 'Available'), ('OCCUPIED', 'Occupied'), ('MAINTENANCE', 'Maintenance')), default='AVAILABLE')

    def __str__(self):
        return f"Room {self.room_number} ({self.category.name})"

class Reservation(models.Model):
    STATUS_CHOICES = (
        ('PENDING',   'Pending'),
        ('ACCEPTED',  'Accepted'),
        ('REJECTED',  'Rejected'),
        ('CANCELLED', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    room_category = models.ForeignKey(RoomCategory, on_delete=models.CASCADE, related_name='reservations')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')

    # ── Date fields (canonical: start_date/end_date; check_in/check_out kept for compat) ──
    check_in  = models.DateField()
    check_out = models.DateField()
    start_date = models.DateField(null=True, blank=True)
    end_date   = models.DateField(null=True, blank=True)

    # ── Quantity & pricing ───────────────────────────────────────────────────
    num_rooms   = models.PositiveIntegerField(default=1,
                  help_text="Number of rooms of this category reserved.")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # ── Snapshot: stores estate+room-category state at booking time ──────────
    reservation_details_json = models.JSONField(default=dict, blank=True,
        help_text="Immutable snapshot of estate and room-category at booking time.")

    selected_supplements = models.ManyToManyField(
        Supplement, blank=True, related_name='reservations'
    )
    note = models.TextField(blank=True, null=True, help_text="Note from the client.")

    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Keep start_date/end_date in sync with check_in/check_out."""
        if self.check_in and not self.start_date:
            self.start_date = self.check_in
        if self.check_out and not self.end_date:
            self.end_date = self.check_out
        if self.start_date and not self.check_in:
            self.check_in = self.start_date
        if self.end_date and not self.check_out:
            self.check_out = self.end_date
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Res: {self.user.username} - {self.room_category.name}"

class Invoice(models.Model):
    STATUS_CHOICES = (('UNPAID', 'Unpaid'), ('PAID', 'Paid'))
    reservation = models.OneToOneField(Reservation, on_delete=models.CASCADE, related_name='invoice')
    invoice_id = models.CharField(max_length=50, unique=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNPAID')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.invoice_id:
            self.invoice_id = f"INV-{self.id}-{self.created_at.year}"
            # Use update_fields to only save the invoice_id and avoid recursion or integrity issues
            super().save(update_fields=['invoice_id'])

    def __str__(self):
        return f"Invoice {self.invoice_id}"
