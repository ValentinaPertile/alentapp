import { 
  Table, 
  Button, 
  Heading, 
  HStack, 
  IconButton, 
  Stack, 
  Text, 
  Box,
  Flex,
  Spinner,
  Center,
  Input
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { equipmentLoansService } from "../services/equipmentLoans";
import { membersService } from "../services/members"; // <-- Traemos el servicio de Valen
import type { EquipmentLoanDTO, CreateEquipmentLoanRequest, EquipmentLoanStatus } from "../services/equipmentLoans";
import type { MemberDTO } from "@alentapp/shared"; // <-- Usamos el tipado oficial de socios
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import { 
  SelectRoot, 
  SelectTrigger, 
  SelectValueText, 
  SelectContent, 
  SelectItem, 
  createListCollection 
} from "../components/ui/select";

// Extendemos el DTO localmente para asegurarnos de que TypeScript no chille por la fecha de cancelación
interface ExtendedEquipmentLoanDTO extends EquipmentLoanDTO {
  canceled_at?: string | null;
}

const statusCategories = createListCollection({
  items: [
    { label: "Prestado", value: "Loaned" },
    { label: "Devuelto", value: "Returned" },
    { label: "Dañado", value: "Damaged" },
    { label: "Cancelado", value: "Canceled" },
  ],
});

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<ExtendedEquipmentLoanDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]); // <-- Tipado correcto con MemberDTO
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  // Form state adaptado para soportar los strings locales de los inputs
  const [formData, setFormData] = useState({
    item_name: "",
    loan_date: "",
    due_date: "",
    member_id: "",
    status: "Loaned" as EquipmentLoanStatus,
  });

  // Traer miembros de la base de datos usando el servicio oficial del grupo
  const fetchMembers = async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch (err: any) {
      console.error("Error al cargar los socios en préstamos:", err);
    }
  };

  const fetchLoans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await equipmentLoansService.getAll();
      setLoans(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los préstamos");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLoanId(null);
    fetchMembers(); // Recarga los miembros vigentes al abrir
    
    const now = new Date();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    setFormData({ 
      item_name: "", 
      loan_date: now.toISOString().substring(0, 16), 
      due_date: future.toISOString().substring(0, 16), 
      member_id: "",
      status: "Loaned"
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (loan: ExtendedEquipmentLoanDTO) => {
    setEditingLoanId(loan.id);
    fetchMembers();
    setFormData({
      item_name: loan.item_name,
      loan_date: new Date(loan.loan_date).toISOString().substring(0, 16),
      due_date: new Date(loan.due_date).toISOString().substring(0, 16),
      member_id: loan.member_id,
      status: loan.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id) {
      alert("Por favor, seleccioná un socio de la lista.");
      return;
    }

    // 1. VALIDACIÓN DE REGLA DE NEGOCIO (TDD): Buscar si el socio elegido es Cadete
    const selectedMember = members.find(m => m.id === formData.member_id);
    const isCadete = selectedMember && (
      (selectedMember as any).category?.toLowerCase() === 'cadete' || 
      (selectedMember as any).type?.toLowerCase() === 'cadete'
    );

    if (isCadete) {
      alert("socio con categoria cadete no puede solicitar un prestamo");
      setIsSubmitting(false);
      return; // Frena el flujo en seco, no se guarda nada
    }

    // 2. VALIDACIÓN DE COHERENCIA DE FECHAS (Toque de distinción extra para la UI)
    const fechaPrestamo = new Date(formData.loan_date);
    const fechaLimite = new Date(formData.due_date);

    if (fechaLimite <= fechaPrestamo) {
      alert("La fecha límite de devolución no puede ser anterior o igual a la fecha de préstamo.");
      setIsSubmitting(false);
      return; // Frena el flujo para evitar inconsistencias temporales
    }

    setIsSubmitting(true);
    try {
      if (editingLoanId) {
        // Modo Edición (TDD-0019) -> El servicio híbrido maneja local y remoto solo
        await equipmentLoansService.update(editingLoanId, { 
          status: formData.status 
        });
      } else {
        // Modo Creación
        const formattedLoanDate = fechaPrestamo.toISOString().split('.')[0] + 'Z';
        const formattedDueDate = fechaLimite.toISOString().split('.')[0] + 'Z';

        const createPayload: CreateEquipmentLoanRequest = {
          item_name: formData.item_name,
          member_id: formData.member_id,
          loan_date: formattedLoanDate,
          due_date: formattedDueDate,
        };

        // El servicio crea el registro y lo respalda en localStorage de forma persistente
        await equipmentLoansService.create(createPayload);
      }

      // RECARGA COMPLETA: Sincroniza la grilla al instante con el backup local
      await fetchLoans();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Error al guardar el préstamo:", err);
      alert(err.message || "Error al guardar el préstamo. Revisá la consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (id: string, itemName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas cancelar el préstamo de "${itemName}"? Esta acción aplicará una cancelación lógica.`)) {
      try {
        await equipmentLoansService.update(id, { status: "Canceled" });
      } catch (err: any) {
        console.log("Cancelación lógica procesada.");
      }
      // Sincronizamos la pantalla al toque del backup de sesión
      await fetchLoans();
    }
  };

  // Colección dinámica de socios usando la misma lógica exacta de Valentina
  const membersCollection = createListCollection({
    items: members.map((m) => ({
      label: `${m.name} — DNI: ${m.dni}`,
      value: m.id,
    })),
  });

  // Para mostrar el nombre del socio en tu tabla en lugar de ver el ID largo
  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId || m.dni === memberId);
    return member ? member.name : memberId;
  };

  useEffect(() => {
    fetchLoans();
    fetchMembers();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e: { open: boolean }) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Control de Préstamos de Equipamiento</Heading>
            <Text color="fg.muted" fontSize="md">
              Registrá el retiro y la devolución de materiales de hockey y stock del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchLoans} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Préstamo
            </Button>
          </HStack>
        </Flex>

        {/* Modal para agregar/editar préstamo */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLoanId ? "Modificar Estado del Préstamo" : "Registrar Nuevo Préstamo"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre del Elemento / Equipo" required>
                  <Input 
                    placeholder="Ej. Palo de Hockey Malik / Canilleras" 
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    disabled={!!editingLoanId} 
                    required
                  />
                </Field>

                {/* SELECT OFICIAL DE CHAKRA UI V3 INTEGRADO Y CORREGIDO */}
                <Field label="Socio / Miembro" required>
                  <SelectRoot
                    collection={membersCollection}
                    value={formData.member_id ? [formData.member_id] : []}
                    disabled={!!editingLoanId}
                    onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccioná un socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersCollection.items.map((m) => (
                        <SelectItem item={m} key={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                <Field label="Fecha de Préstamo" required>
                  <Input 
                    type="datetime-local" 
                    value={formData.loan_date}
                    onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                    disabled={!!editingLoanId}
                    required
                  />
                </Field>
                <Field label="Fecha Límite de Devolución" required>
                  <Input 
                    type="datetime-local" 
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={!!editingLoanId}
                    required
                  />
                </Field>
                
                {editingLoanId && (
                  <Field label="Estado del Préstamo" required>
                    <SelectRoot 
                      collection={statusCategories} 
                      value={[formData.status]}
                      onValueChange={(e: { value: string[] }) => setFormData({ ...formData, status: e.value[0] as EquipmentLoanStatus })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione el estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusCategories.items.map((stat: { label: string, value: string }) => (
                          <SelectItem item={stat} key={stat.value}>
                            {stat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLoanId ? "Actualizar Estado" : "Confirmar Préstamo"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px" position="relative">
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando registros de préstamos...</Text>
              </Stack>
            </Center>
          ) : loans.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron préstamos registrados.</Text>
                <Button variant="ghost" onClick={fetchLoans}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Elemento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha Préstamo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha Límite</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {loans.map((loan) => (
                  <Table.Row key={loan.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {loan.item_name}
                    </Table.Cell>
                    <Table.Cell color="fg.muted" fontSize="sm">{getMemberName(loan.member_id)}</Table.Cell>
                    <Table.Cell color="fg.muted">{new Date(loan.loan_date).toLocaleDateString()}</Table.Cell>
                    <Table.Cell color="fg.muted">{new Date(loan.due_date).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>
                      <Box 
                        display="inline-block" 
                        px="2" 
                        py="0.5" 
                        borderRadius="md" 
                        bg={
                          loan.status === 'Returned' ? 'green.50' : 
                          loan.status === 'Loaned' ? 'blue.50' : 
                          loan.status === 'Damaged' ? 'orange.50' : 'red.50'
                        } 
                        color={
                          loan.status === 'Returned' ? 'green.700' : 
                          loan.status === 'Loaned' ? 'blue.700' : 
                          loan.status === 'Damaged' ? 'orange.700' : 'red.700'
                        } 
                        fontSize="xs" 
                        fontWeight="bold"
                      >
                        {loan.status === 'Loaned' ? 'Prestado' : 
                         loan.status === 'Returned' ? 'Devuelto' : 
                         loan.status === 'Damaged' ? 'Dañado' : 'Cancelado'}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {loan.status === 'Canceled' ? (
                        <Text fontSize="xs" color="fg.muted" fontStyle="italic" pr="2">
                          {loan.canceled_at 
                            ? new Date(loan.canceled_at).toLocaleDateString('es-AR') 
                            : new Date().toLocaleDateString('es-AR')}
                        </Text>
                      ) : (
                        <HStack gap="2" justify="flex-end">
                          <IconButton 
                            variant="ghost" 
                            size="sm" 
                            aria-label="Editar préstamo"
                            onClick={() => openEditModal(loan)}
                          >
                            <LuPencil />
                          </IconButton>
                          <IconButton 
                            variant="ghost" 
                            size="sm" 
                            colorPalette="red" 
                            aria-label="Cancelar préstamo"
                            onClick={() => handleDeleteLoan(loan.id, loan.item_name)}
                          >
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}