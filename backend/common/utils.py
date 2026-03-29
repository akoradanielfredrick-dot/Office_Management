import datetime
from django.db import transaction

def generate_reference_number(model_class, prefix, field_name='reference_no'):
    """
    Generates a sequential reference number: PREFIX-YYYY-XXXX
    Example: QTN-2026-0001
    """
    year = datetime.datetime.now().year
    
    with transaction.atomic():
        # Dynamic filter for the specified field starting with Prefix-Year-
        filter_kwargs = {f"{field_name}__startswith": f"{prefix}-{year}-"}
        last_instance = model_class.objects.filter(**filter_kwargs).order_by(field_name).last()
        
        if last_instance:
            try:
                # Access the attribute dynamically
                ref_value = getattr(last_instance, field_name)
                last_no = int(ref_value.split('-')[-1])
                new_no = last_no + 1
            except (ValueError, IndexError, AttributeError):
                new_no = 1
        else:
            new_no = 1
            
        return f"{prefix}-{year}-{new_no:04d}"
