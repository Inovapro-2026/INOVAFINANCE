import { Dexie, type Table } from 'dexie';
import { Transaction, Goal, UserProfile } from './types';

// Fix: Using named import for Dexie to ensure proper class inheritance and type resolution.
// In some TypeScript environments, the 'Dexie' class is primarily exposed as 
// a named export for proper extending. This ensures methods like 'version' and 'stores' 
// are correctly recognized on the subclass instance by the TypeScript compiler.
export class InovaFinanceDB extends Dexie {
  transactions!: Table<Transaction>;
  goals!: Table<Goal>;
  profiles!: Table<UserProfile>;

  constructor() {
    // Call super with the database name to initialize the Dexie instance correctly.
    super('InovaFinanceDB');
    
    // Define the database schema using the inherited 'version' and 'stores' methods.
    // This resolves the error where 'version' was not found on the subclass instance.
    this.version(1).stores({
      transactions: '++id, userId, type, category, date',
      goals: '++id, userId, deadline',
      profiles: 'userId'
    });
  }
}

export const db = new InovaFinanceDB();