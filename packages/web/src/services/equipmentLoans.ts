// Contratos de API basados estrictamente en TDD-0018 y TDD-0019
export type EquipmentLoanStatus = 'Loaned' | 'Returned' | 'Damaged' | 'Canceled';

export interface EquipmentLoanDTO {
  id: string;
  item_name: string;
  status: EquipmentLoanStatus;
  loan_date: string;
  due_date: string;
  canceled_at: string | null;
  member_id: string;
}

export interface CreateEquipmentLoanRequest {
  item_name: string;
  loan_date: string; // ISO DateTime string
  due_date: string;  // ISO DateTime string
  member_id: string; // UUID del socio
}

export interface UpdateEquipmentLoanRequest {
  status: EquipmentLoanStatus;
}

const API_URL = 'http://127.0.0.1:3001/api/v1';
const LOCAL_STORAGE_KEY = 'alentapp_loans_backup';

export const equipmentLoansService = {
  // Obtener todos los préstamos registrados (Con persistencia híbrida de sesión)
  async getAll(): Promise<EquipmentLoanDTO[]> {
    try {
      const response = await fetch(`${API_URL}/equipment-loans`);
      
      if (response.ok) {
        const result = await response.json();
        if (result && Array.isArray(result.data)) return result.data;
        if (result && Array.isArray(result.loans)) return result.loans;
        if (Array.isArray(result)) return result;
      }
      
      // Si la API da error o 404, rescatamos los datos que guardaste en esta compu
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      return localData ? JSON.parse(localData) : [];
    } catch (err) {
      // Si se cae la red o Docker no responde, también usamos el backup local
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      return localData ? JSON.parse(localData) : [];
    }
  },

  // Registrar un nuevo préstamo (TDD-0018)
  async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
    // 1. Armamos el objeto simulado por si falla la red o para acompañar el estado
    const newLoan: EquipmentLoanDTO = {
      id: "loan-local-" + Date.now(),
      item_name: data.item_name,
      status: "Loaned",
      loan_date: data.loan_date,
      due_date: data.due_date,
      canceled_at: null,
      member_id: data.member_id
    };

    // 2. Guardamos en el localStorage como backup inmediato
    const existing = await this.getAll();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newLoan, ...existing]));

    // 3. Intentamos enviarlo al backend real en Docker
    try {
      const response = await fetch(`${API_URL}/equipment-loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data || result;
      }
    } catch (apiErr) {
      console.log("Backend offline o con errores, reteniendo registro en local storage.");
    }

    return newLoan;
  },

  // Actualizar estado del préstamo (TDD-0019)
  async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
    // 1. Actualizamos primero nuestro backup local para que persista al actualizar
    const existing = await this.getAll();
    const updatedList = existing.map(loan => 
      loan.id === id ? { ...loan, status: data.status } : loan
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    // 2. Intentamos impactar al backend de Docker por si las dudas
    try {
      const response = await fetch(`${API_URL}/equipment-loans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const result = await response.json();
        return result.data || result;
      }
    } catch (apiErr) {
      console.log("Sincronización de estado remota omitida (Modo Local persistente).");
    }

    const found = updatedList.find(l => l.id === id);
    if (!found) throw new Error("No se encontró el préstamo.");
    return found;
  },
};