<?php
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtAuth
{
    private $issuer = 'animehub';
    private $audience = 'animehub-web';

    public function generate_token_user($user_data)
    {
        $issued_at = time();

        $payload = [
            'iat' => $issued_at,
            'exp' => $issued_at + JWT_TTL,
            'iss' => $this->issuer,
            'aud' => $this->audience,
            'role' => 'user',
            'id' => (int) $user_data->id,
            'email' => $user_data->email,
            'name' => $user_data->name,
        ];

        return JWT::encode($payload, JWT_SECRET, 'HS256');
    }

    public function validate_token($jwt)
    {
        try {
            $decoded = (array) JWT::decode($jwt, new Key(JWT_SECRET, 'HS256'));
            if (($decoded['iss'] ?? null) !== $this->issuer || ($decoded['aud'] ?? null) !== $this->audience) {
                return null;
            }
            return $decoded;
        } catch (Throwable $e) {
            return null;
        }
    }
}
