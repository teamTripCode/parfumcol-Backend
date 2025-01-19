import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    private readonly jwtSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.jwtSecret = this.configService.get<string>('SECRET_ENCRYPT_TOKEN');
    }

    // Generar un token
    generateToken(payload: object, expiresIn: string = '1h'): string {
        return jwt.sign(payload, this.jwtSecret, { expiresIn });
    }

    // Verificar un token
    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Token inválido o expirado');
        }
    }
}
