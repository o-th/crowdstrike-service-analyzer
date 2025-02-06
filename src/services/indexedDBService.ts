const DB_NAME = 'crowdstrike_analyzer';
const DB_VERSION = 1;
const STORE_NAME = 'analyzer_data';

interface StorageData {
  rawData: any[];
  results: any[] | null;
  searchTerm: string;
  selectedSource: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  dateConstraints: {
    minDate: string;
    maxDate: string;
  };
  currentFile: string;
}

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => resolve();

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveData = async (data: StorageData): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(data, 'current_data');
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
};

export const loadData = async (): Promise<StorageData | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const getRequest = store.get('current_data');
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
};

export const clearData = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.delete('current_data');
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
};
