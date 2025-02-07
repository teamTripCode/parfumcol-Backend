import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AccountInNode } from 'src/accounts/dto/create-account.dto';

@Injectable()
export class TripnodeService {
    private readonly BASE_URL = 'http://localhost:3002';

    // 1. Crear un bloque
    async createBlock(blockData: any, publicKeyString: string) {
        try {
            const payload = {
                method: 'createBlock',
                params: [blockData, publicKeyString]
            };
            const response = await axios.post(`${this.BASE_URL}`, payload);
            return response.data;
        } catch (error) {
            console.error('Error creating block:', error);
            throw error;
        }
    }

    async createAccountInNode(name: string, email: string) {
        try {
            if (!name) throw new Error('Name is required!');
            if (!email) throw new Error('Email is required!');

            const response = await axios.post(
                `${this.BASE_URL}/account`,
                { name, email },
            )

            if (response.data.success === false) throw new Error(response.data.error);

            const account: AccountInNode = response.data.data;
            return account;
        } catch (error) {
            if (error instanceof Error) {

            }
        }
    }

    // 2. Crear un bloque con recompensas
    async createBlockWithRewards(
        from: string, // Clave pública del cliente
        to: string,   // Clave pública del negocio
        amount: number, // Monto de la transacción en USD
        tokenId: string, // ID del token asociado al negocio
    ) {
        try {
            const payload = {
                from,
                to,
                amount,
                tokenId,
            };

            // Enviar la solicitud al endpoint /apply-rewards
            const response = await axios.post(`${this.BASE_URL}/chain/apply-rewards`, payload);
            if (response.data.success == false) throw new Error(response.data.error);
            const res = response.data.data;
            return { success: true, data: res }
        } catch (error) {
            if (error instanceof Error) {
                return { success: false, error: error.message }
            }
        }
    }

    // 3. Obtener los bloques asociados a una cuenta específica
    async getAccountBlocks(publicKey: string) {
        try {
            const payload = { publicKey };
            const response = await axios.post(`${this.BASE_URL}/account`, payload);
            return response.data;
        } catch (error) {
            console.error('Error fetching account blocks:', error);
            throw error;
        }
    }

    // 4. Obtener la información de un bloque específico
    async getBlockInfo(blockIndex: number, publicKey: string) {
        try {
            const payload = { blockIndex, publicKey };
            const response = await axios.post(`${this.BASE_URL}/decrypt`, payload);
            return response.data;
        } catch (error) {
            console.error('Error fetching block info:', error);
            throw error;
        }
    }

    /**
     * 5. Registrar un proceso interno en la cadena de bloques.
     * @param processDescription Descripción del proceso interno.
     * @param processDetails Detalles adicionales del proceso.
     * @param publicKeyString Clave pública del sistema o usuario que registra el proceso.
     * @returns Respuesta del servidor con el bloque creado.
     */
    async registerInternalProcess(processDescription: string, processDetails: any, publicKeyString: string) {
        const blockData = {
            description: processDescription,
            details: processDetails,
            timestamp: new Date().toISOString()
        };
        return this.createBlock(blockData, publicKeyString);
    }
}