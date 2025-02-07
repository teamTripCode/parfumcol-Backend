import { LotionDto } from "src/admin/dto/create-admin.dto"

export class OrderDto {
    id?: string
    account?: AccountDto
    accountId: string
    items: OrderItem[]
    totalAmount: number
    status: orderStatus
    createdAt?: Date
    updatedAt?: Date
}

export class OrderItem {
    id: string
    orderId: String
    order: OrderDto
    lotionId: String
    lotion: LotionDto
    quantity: number
    price: number
    totalPrice: number
}

export class Cart {
    id?: String
    accountId: String
    account?: AccountDto
    items: CartItem[]
    totalAmount: number
    createdAt?: Date
    updatedAt?: Date
}

export class CartItem {
    id?: String
    cartId: String
    cart?: Cart
    lotionId: String
    lotion?: LotionDto
    quantity: number
    price: number
    totalPrice: number
}

export class AccountDto {
    id: string
    name: string
    lastName: string
    email: string
    password: string
    country?: string
    code_country?: string
    city?: string
    phone?: string
    home_address?: string
    identity_number?: string
    type_identity?: TypeIdentity
    public_key_node: string
    private_key_node: string
    accountHash: string
    iv: string
    salt: string
    auth_tag: string
    orders?: OrderDto[]
    cart: Cart
    CardInfoAccount?: CardInfoAccount[]
}

export class BalancesAccount {
    currency: string
    amount: string
}

export class AccountInNode {
    accountHash: string
    name: string
    email: string
    publicKey: string
    privateKey: string
    balances: BalancesAccount[]
}

export class CardInfoAccount {
    id?: string
    account?: AccountDto
    accountId: string
    encryptInfo: string
    createdAt?: Date
    updatedAt?: Date
}

export type orderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELED";
export type TypeIdentity = 'CC' | 'CE';
