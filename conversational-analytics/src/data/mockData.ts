export interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
}

export interface Customer {
    id: number;
    name: string;
    email: string;
    city: string;
    country: string;
    join_date: string;
}

export interface Sale {
    id: number;
    product_id: number;
    customer_id: number;
    date: string;
    quantity: number;
    total_amount: number;
}

export interface Database {
    products: Product[];
    customers: Customer[];
    sales: Sale[];
}

export const MOCK_DB: Database = {
    products: [
        { id: 1, name: "Laptop Pro X", category: "Electronics", price: 1200, stock: 50 },
        { id: 2, name: "Wireless Headphones", category: "Electronics", price: 150, stock: 200 },
        { id: 3, name: "Ergonomic Chair", category: "Furniture", price: 300, stock: 30 },
        { id: 4, name: "Coffee Maker", category: "Appliances", price: 80, stock: 100 },
        { id: 5, name: "Running Shoes", category: "Apparel", price: 120, stock: 75 },
        { id: 6, name: "Smartphone Z", category: "Electronics", price: 800, stock: 60 },
        { id: 7, name: "Desk Lamp", category: "Furniture", price: 40, stock: 150 },
        { id: 8, name: "Blender", category: "Appliances", price: 60, stock: 90 },
    ],
    customers: [
        { id: 101, name: "Alice Johnson", email: "alice@example.com", city: "New York", country: "USA", join_date: "2023-01-15" },
        { id: 102, name: "Bob Smith", email: "bob@example.com", city: "London", country: "UK", join_date: "2023-02-20" },
        { id: 103, name: "Charlie Davis", email: "charlie@example.com", city: "Toronto", country: "Canada", join_date: "2023-03-10" },
        { id: 104, name: "Diana Evans", email: "diana@example.com", city: "Sydney", country: "Australia", join_date: "2023-04-05" },
        { id: 105, name: "Ethan Hunt", email: "ethan@example.com", city: "New York", country: "USA", join_date: "2023-05-12" },
    ],
    sales: [
        { id: 1001, product_id: 1, customer_id: 101, date: "2023-06-01", quantity: 1, total_amount: 1200 },
        { id: 1002, product_id: 2, customer_id: 102, date: "2023-06-02", quantity: 2, total_amount: 300 },
        { id: 1003, product_id: 3, customer_id: 103, date: "2023-06-03", quantity: 1, total_amount: 300 },
        { id: 1004, product_id: 4, customer_id: 101, date: "2023-06-04", quantity: 1, total_amount: 80 },
        { id: 1005, product_id: 5, customer_id: 104, date: "2023-06-05", quantity: 2, total_amount: 240 },
        { id: 1006, product_id: 1, customer_id: 105, date: "2023-06-06", quantity: 1, total_amount: 1200 },
        { id: 1007, product_id: 2, customer_id: 101, date: "2023-06-07", quantity: 1, total_amount: 150 },
        { id: 1008, product_id: 6, customer_id: 102, date: "2023-06-08", quantity: 1, total_amount: 800 },
        { id: 1009, product_id: 3, customer_id: 105, date: "2023-06-09", quantity: 2, total_amount: 600 },
        { id: 1010, product_id: 8, customer_id: 103, date: "2023-06-10", quantity: 1, total_amount: 60 },
    ]
};

export const SCHEMA_DEFINITION = `
Table products:
- id (number)
- name (string)
- category (string)
- price (number)
- stock (number)

Table customers:
- id (number)
- name (string)
- email (string)
- city (string)
- country (string)
- join_date (string, YYYY-MM-DD)

Table sales:
- id (number)
- product_id (number)
- customer_id (number)
- date (string, YYYY-MM-DD)
- quantity (number)
- total_amount (number)
`;
