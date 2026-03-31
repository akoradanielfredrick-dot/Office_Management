Shared image assets for the system live in this folder.

This folder is used by:
- the React frontend through Vite public assets
- the Django backend through STATICFILES_DIRS

Current shared files:
- mranga-logo.png : full brand logo for larger placements
- mranga-icon.png : cropped icon asset used in the frontend favicon and backend admin header

How to update:
1. Replace `mranga-logo.png` if you want to change the full brand artwork.
2. Replace `mranga-icon.png` if you want to change compact icon usage.
3. Keep the same filenames if you do not want to update code references.
4. Refresh the frontend page after replacing them.
5. For the backend, run `python manage.py collectstatic --noinput` if needed.

Recommendation:
- Use a square PNG with transparent background.
- Keep the mark simple so it reads well at small sizes.
