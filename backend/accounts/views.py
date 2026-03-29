from django.contrib.auth import authenticate, login, logout
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, email=email, password=password)

        if user is None:
            raise serializers.ValidationError({'detail': 'Invalid email or password. Please try again.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        login(request, user)

        role_name = user.role.name if user.role else None
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': role_name,
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
