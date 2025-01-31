export class orderDetails {
    id: string
    amount: number
    quantity: number
}

export class cardHolderId {
    type: 'CC' | 'CE';
    number: string;
}

export class CardHolder {
    name: string;
    identification: cardHolderId;
}

export class CardData {
    card_number: string;
    expiration_month: string;
    expiration_year: string;
    security_code: string;
    cardHolder: CardHolder;
}
