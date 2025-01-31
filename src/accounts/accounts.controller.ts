import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { OrderDto } from './dto/create-account.dto';  // Suponiendo que tienes un DTO para la creación de ordenes
import { orderStatus } from './dto/create-account.dto';  // Si tienes el tipo de estado de la orden en este archivo
import { CardData } from 'src/payment/dto/create-payment.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  // Crear una cuenta
  @Post()
  async createAccount(@Body() accountDto: AccountDto) {
    return this.accountsService.createAccount(accountDto);
  }

  @Get('me/:id')
  async profileAccount(@Param('id') id: string) {
    return this.accountsService.profileAccount(id);
  }

  // Actualizar una cuenta
  @Patch(':id')
  async updateAccount(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.updateAccount(id, updateAccountDto);
  }

  // Eliminar una cuenta
  @Delete(':id')
  async deleteAccount(@Param('id') id: string) {
    return this.accountsService.deleteAccount(id);
  }

  @Post('login')
  async LoginAccount(@Body() data: { email: string, password: string }) {
    const { email, password } = data;
    return this.accountsService.login(email, password);
  }

  @Get('cart/:cartId/count')
  async countCartItems(@Param('cartId') cartId: string) {
    return this.accountsService.countItemsCart(cartId)
  }

  @Get('cart/:cartId')
  async getItemsCart(@Param('cartId') cartId: string) {
    return this.accountsService.getItemsInCart(cartId);
  }

  // Agregar un item al carrito de la cuenta
  @Post(':accountId/cart')
  async addItemToCart(@Param('accountId') accountId: string, @Body() { lotionId, quantity }: { lotionId: string, quantity: number }) {
    return this.accountsService.addItemToCart(accountId, lotionId, quantity);
  }

  // Guardar una tarjeta
  @Post(':accountId/cards')
  async saveCard(@Param('accountId') accountId: string, @Body() cardData: CardData) {
    return this.accountsService.saveInfoCard(accountId, cardData);
  }

  // Obtener tarjetas del usuario (solo últimos 4 dígitos)
  @Get(':accountId/cards')
  async getUserCards(@Param('accountId') accountId: string) {
    return this.accountsService.getUserCards(accountId);
  }

  // Eliminar un item del carrito de la cuenta por su ID
  @Delete(':accountId/cart/:itemId')
  async removeItemFromCart(@Param('accountId') accountId: string, @Param('itemId') itemId: string) {
    return this.accountsService.removeItemFromCart(accountId, itemId);
  }

  // Eliminar todos los items del carrito
  @Delete(':accountId/cart')
  async clearCart(@Param('accountId') accountId: string) {
    return this.accountsService.clearCart(accountId);
  }

  // Crear una orden
  @Post(':accountId/orders')
  async createOrder(@Param('accountId') accountId: string, @Body() orderDto: OrderDto) {
    return this.accountsService.createOrder(accountId, orderDto);
  }

  // Actualizar una orden
  @Patch('orders/:orderId')
  async updateOrder(@Param('orderId') orderId: string, @Body() updateData: any) {
    return this.accountsService.updateOrder(orderId, updateData);
  }

  // Cambiar el estado de una orden
  @Patch('orders/:orderId/status')
  async changeOrderStatus(@Param('orderId') orderId: string, @Body() { status }: { status: orderStatus }) {
    return this.accountsService.changeOrderStatus(orderId, status);
  }
}
