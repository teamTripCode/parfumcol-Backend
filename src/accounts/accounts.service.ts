import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { OrderDto, orderStatus } from './dto/create-account.dto';
import * as bcrypt from "bcrypt"
import { TokenService } from 'src/token/token.service';
import { CardData } from 'src/payment/dto/create-payment.dto';
import * as crypto from "crypto"

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) { }

  private readonly jwtSecret: string;

  // Crear una cuenta y un carrito asociado
  public async createAccount(account: AccountDto) {
    const {
      name,
      lastName,
      email,
      phone,
      home_address,
      password: plainPassword,
      city,
      code_country,
      country
    } = account;

    try {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const resAccount = await this.prisma.accounts.create({
        data: {
          name,
          lastName,
          email,
          password: hashedPassword,
          phone,
          home_address,
          city,
          code_country,
          country,
          cart: {
            create: {},
          },
        },
        include: {
          cart: true,
        },
      });

      const { password: _, ...secRes } = resAccount;

      const token = this.tokenService.generateToken({
        accountId: resAccount.id,
        cartId: resAccount.cart?.id || null,
      });

      return { success: true, access_token: token, data: { user: secRes } };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  public async profileAccount(id: string) {
    try {
      const user = await this.prisma.accounts.findUnique({ where: { id }, include: { cart: true } });
      const { password, ...secRes } = user;
      return { success: true, data: secRes }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }

  }

  // Método para loguearse
  public async login(email: string, password: string) {
    try {
      // Buscar la cuenta por email
      const account = await this.prisma.accounts.findUnique({
        where: { email },
        include: { cart: true },
      });

      if (!account) {
        return { success: false, error: 'Cuenta inexistente' };
      }

      const isPasswordValid = await bcrypt.compare(password, account.password);

      if (!isPasswordValid) {
        return { success: false, error: 'Credenciales incorrectas. La contraseña es incorrecta.' };
      }

      const token = this.tokenService.generateToken({
        accountId: account.id,
        cartId: account.cart?.id || null,
      });

      return { success: true, accessToken: token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return { success: false, error: 'Error al iniciar sesión. Intenta nuevamente más tarde.' };
    }
  }

  // Actualizar una cuenta
  public async updateAccount(id: string, updateData: UpdateAccountDto) {
    try {
      const prismaUpdateData: any = { ...updateData };

      // Transformar las relaciones a estructuras compatibles con Prisma
      if (updateData.orders) {
        prismaUpdateData.orders = {
          connect: updateData.orders.connect,
          disconnect: updateData.orders.disconnect,
        };
      }

      if (updateData.cart) {
        prismaUpdateData.cart = {
          connect: updateData.cart.connect,
          disconnect: updateData.cart.disconnect,
        };
      }

      const updatedAccount = await this.prisma.accounts.update({
        where: { id },
        data: prismaUpdateData,
      });

      return { success: true, data: updatedAccount };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Guardar una tarjeta
  public async saveInfoCard(accountId: string, info: CardData) {
    try {
      // Primero validar los datos de la tarjeta
      const validation = this.validateCardData(info);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const account = await this.prisma.accounts.findUnique({
        where: { id: accountId }
      });

      if (!account) return { success: false, error: "Cuenta no encontrada." };

      // Formatear el número de tarjeta antes de encriptar
      const formattedInfo = {
        ...info,
        card_number: info.card_number.replace(/\s+/g, '')
      };

      // Usar la contraseña desencriptada como clave para cifrar la tarjeta
      const encryptionKey = crypto.createHash("sha256")
        .update(account.password)
        .digest("hex")
        .substring(0, 32);

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(encryptionKey), iv);

      let encrypted = cipher.update(JSON.stringify(formattedInfo), "utf8", "hex");
      encrypted += cipher.final("hex");

      const encryptedData = iv.toString("hex") + ":" + encrypted;

      // Guardar la información en la base de datos
      const savedCard = await this.prisma.cardInfoAccount.create({
        data: {
          accountId,
          encryptInfo: encryptedData
        }
      });

      return { success: true, data: savedCard }
    } catch (error) {

    }
  }

  // Obtener tarjetas del usuario mostrando solo los últimos 4 dígitos
  public async getUserCards(accountId: string) {
    try {
      const account = await this.prisma.accounts.findUnique({
        where: { id: accountId },
        include: { CardInfoAccount: true }
      });

      if (!account) return [];

      // Usar la contraseña del usuario como clave de descifrado
      const encryptionKey = crypto.createHash("sha256").update(account.password).digest("hex").substring(0, 32);

      const decryptedCards = account.CardInfoAccount.map(card => {
        try {
          const [ivHex, encryptedData] = card.encryptInfo.split(":");
          const iv = Buffer.from(ivHex, "hex");
          const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(encryptionKey), iv);
          let decrypted = decipher.update(encryptedData, "hex", "utf8");
          decrypted += decipher.final("utf8");

          const parsedCard: CardData = JSON.parse(decrypted);

          return {
            idCardInfoAccount: card.id,
            lastFourDigits: parsedCard.card_number.slice(-4),
            expirationDate: `${parsedCard.expiration_month}/${parsedCard.expiration_year}`,
          };
        } catch {
          return { idCardInfoAccount: card.id, lastFourDigits: "Error al descifrar" };
        }
      });

      return { success: true, data: decryptedCards };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  public async getCardById(accountId: string, idCardInfoAccount: string) {
    try {
      const account = await this.prisma.accounts.findUnique({
        where: { id: accountId },
        include: { CardInfoAccount: true }
      });

      if (!account) return null;

      // Buscar la tarjeta específica
      const cardInfo = account.CardInfoAccount.find(card => card.id === idCardInfoAccount);
      if (!cardInfo) return null;

      // Usar la contraseña del usuario como clave de descifrado
      const encryptionKey = crypto.createHash("sha256").update(account.password).digest("hex").substring(0, 32);

      try {
        const [ivHex, encryptedData] = cardInfo.encryptInfo.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(encryptionKey), iv);
        let decrypted = decipher.update(encryptedData, "hex", "utf8");
        decrypted += decipher.final("utf8");

        const parsedCard: CardData = JSON.parse(decrypted);
        return { success: true, data: parsedCard };
      } catch (error) {
        if (error instanceof Error) {
          return { success: false, error: error.message }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  // Eliminar una cuenta
  public async deleteAccount(id: string) {
    try {
      const deletedAccount = await this.prisma.accounts.delete({
        where: { id },
      });
      return { success: true, data: deletedAccount };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  public async countItemsCart(id: string) {
    try {
      const items = await this.prisma.cartItem.count({ where: { cartId: id } })
      return { success: true, data: items }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  public async getItemsInCart(cartId: string) {
    try {
      const items = await this.prisma.cartItem.findMany({ where: { cartId }, include: { lotion: true } })
      if (items.length == 0) return { success: true, message: "Tu Carrito esta vacio" };
      return { success: true, data: items }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  // Agregar un item al carrito de la cuenta
  public async addItemToCart(accountId: string, lotionId: string, quantity: number) {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { accountId },
        include: { items: true },
      });

      if (!cart) {
        return { success: false, error: 'Carrito no encontrado para esta cuenta.' };
      }

      const existingItem = cart.items.find(item => item.lotionId === lotionId);
      if (existingItem) {
        // Si el item ya existe, actualiza la cantidad
        const updatedItem = await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            totalPrice: (existingItem.quantity + quantity) * existingItem.price,
          },
        });
        return { success: true, data: updatedItem };
      }

      // Si el item no existe, crea uno nuevo
      const lotion = await this.prisma.lotion.findUnique({ where: { id: lotionId } });
      if (!lotion) {
        return { success: false, error: 'Lotion no encontrada.' };
      }

      const newItem = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          lotionId,
          quantity,
          price: lotion.price,
          totalPrice: quantity * lotion.price,
        },
      });

      return { success: true, data: newItem };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Eliminar un item del carrito por su ID
  public async removeItemFromCart(accountId: string, itemId: string) {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { accountId },
        include: { items: true },
      });

      if (!cart) {
        return { success: false, error: 'Carrito no encontrado para esta cuenta.' };
      }

      const itemToRemove = cart.items.find(item => item.id === itemId);
      if (!itemToRemove) {
        return { success: false, error: 'Item no encontrado en el carrito.' };
      }

      const deletedItem = await this.prisma.cartItem.delete({
        where: { id: itemId },
      });

      return { success: true, data: deletedItem };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Eliminar todos los items del carrito
  public async clearCart(accountId: string) {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { accountId },
        include: { items: true },
      });

      if (!cart) {
        return { success: false, error: 'Carrito no encontrado para esta cuenta.' };
      }

      const deletedItems = await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return { success: true, data: deletedItems };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Crear una orden
  public async createOrder(accountId: string, createOrderDto: OrderDto) {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { accountId },
        include: { items: true },
      });

      if (!cart || cart.items.length === 0) {
        return { success: false, error: 'El carrito está vacío.' };
      }

      const totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

      const newOrder = await this.prisma.order.create({
        data: {
          accountId,
          totalAmount,
          items: {
            create: cart.items.map(item => ({
              lotionId: item.lotionId,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      // Opcional: Limpiar el carrito después de crear la orden
      await this.clearCart(accountId);

      return { success: true, data: newOrder };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Actualizar una orden
  public async updateOrder(orderId: string, updateData: any) {
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });
      return { success: true, data: updatedOrder };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  // Cambiar el estado de la orden
  public async changeOrderStatus(orderId: string, status: orderStatus) {
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
      return { success: true, data: updatedOrder };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  private validateCardData(cardData: CardData): { isValid: boolean; error?: string } {
    // Eliminar espacios del número de tarjeta
    const cleanCardNumber = cardData.card_number.replace(/\s+/g, '');

    // Validar longitud de la tarjeta
    if (cleanCardNumber.length !== 16) {
      return { isValid: false, error: 'El número de tarjeta debe tener 16 dígitos.' };
    }

    // Validar que solo contenga números
    if (!/^\d+$/.test(cleanCardNumber)) {
      return { isValid: false, error: 'El número de tarjeta solo debe contener dígitos.' };
    }

    // Validar mes de expiración
    const month = parseInt(cardData.expiration_month);
    if (isNaN(month) || month < 1 || month > 12) {
      return { isValid: false, error: 'Mes de expiración inválido.' };
    }

    // Validar año de expiración
    const currentYear = new Date().getFullYear() % 100; // Obtener últimos 2 dígitos
    const year = parseInt(cardData.expiration_year);
    if (isNaN(year) || year < currentYear) {
      return { isValid: false, error: 'Año de expiración inválido.' };
    }

    // Validar código de seguridad
    if (!/^\d{3,4}$/.test(cardData.security_code)) {
      return { isValid: false, error: 'Código de seguridad inválido.' };
    }

    // Validar nombre del titular
    if (!cardData.cardHolder.name || cardData.cardHolder.name.trim().length < 3) {
      return { isValid: false, error: 'Nombre del titular inválido.' };
    }

    return { isValid: true };
  }
}
