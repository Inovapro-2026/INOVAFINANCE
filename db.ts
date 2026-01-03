import Dexie, { type Table } from 'dexie';
import { Transaction, Goal, UserProfile } from './types';

// Fix: Using the default import for Dexie to ensure proper class inheritance and type resolution.
// In many TypeScript environments, extending from the named export of Dexie can lead to 
// missing method signatures on the subclass. This fix ensures 'version' and 'stores' are recognized.
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