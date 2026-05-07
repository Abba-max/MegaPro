from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('estate_app', '0011_roomcategory_occupied_count_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='quickorder',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pending_payment', 'Paiement en attente'),
                    ('pending',         'En attente'),
                    ('accepted',        'Acceptée'),
                    ('rejected',        'Rejetée'),
                    ('payment_failed',  'Paiement échoué'),
                ],
                default='pending_payment',
            ),
        ) if False else migrations.RunSQL('SELECT 1'),  # status already exists

        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('transaction_id', models.CharField(max_length=100, unique=True)),
                ('cinetpay_id', models.CharField(max_length=100, blank=True, null=True)),
                ('amount', models.IntegerField(default=200)),
                ('currency', models.CharField(max_length=10, default='XAF')),
                ('status', models.CharField(
                    max_length=20,
                    choices=[
                        ('initiated', 'Initiée'),
                        ('success',   'Succès'),
                        ('failed',    'Échouée'),
                        ('cancelled', 'Annulée'),
                    ],
                    default='initiated',
                )),
                ('phone', models.CharField(max_length=20, blank=True, null=True)),
                ('payment_method', models.CharField(max_length=50, blank=True, null=True)),
                ('raw_notify', models.JSONField(default=dict, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.OneToOneField(
                    'estate_app.QuickOrder',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payment',
                    null=True, blank=True,
                )),
                ('user', models.ForeignKey(
                    settings.AUTH_USER_MODEL,
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name='payments',
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]