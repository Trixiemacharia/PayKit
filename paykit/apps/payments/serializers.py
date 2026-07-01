from rest_framework import serializers

class STKPushSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_phone(self, value):
        value = value.strip()
        if not value.startswith("254") or not value[3:].isdigit() or len(value) != 12:
            raise serializers.ValidationError(
                "Phone must be in format 2547XXXXXXXX (12 digits, starting with 254)"
            )
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value