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
import { equipmentLoansService } from "../../services/equipmentLoans";
import type { EquipmentLoanDTO, CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest, EquipmentLoanStatus } from "@alentapp/shared";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { 
  SelectRoot, 
  SelectTrigger, 
  SelectValueText, 
  SelectContent, 
  SelectItem, 
  createListCollection 
} from "../../components/ui/select";

const statusCategories = createListCollection({
  items: [
    { label: "Prestado", value: "Loaned" },
    { label: "Devuelto", value: "Returned" },
    { label: "Cancelado", value: "Canceled" },
  ],
});

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<EquipmentLoanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateEquipmentLoanRequest & { status?: EquipmentLoanStatus }>({
    item_name: "",
    loan_date: "",
    due_date: "",
    member_id: "",
  });

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
    setFormData({ item_name: "", loan_date: "", due_date: "", member_id: "" });
    setIsDialogOpen(true);
  };

  const openEditModal = (loan: EquipmentLoanDTO) => {
    setEditingLoanId(loan.id);
    setFormData({
      item_name: loan.item_name,
      // Recortamos la fecha a YYYY-MM-DD para que el input type="date" lo entienda bien
      loan_date: loan.loan_date.split('T')[0],
      due_date: loan.due_date.split('T')[0],
      member_id: loan.member_id,
      status: loan.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLoanId) {
        await equipmentLoansService.update(editingLoanId, { status: formData.status } as UpdateEquipmentLoanRequest);
      } else {
        await equipmentLoansService.create(formData as CreateEquipmentLoanRequest);
      }
      setIsDialogOpen(false);
      fetchLoans(); // Refresh the list
    } catch (err: any) {
      alert(err.message || "Error al guardar el préstamo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (id: string, itemName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas cancelar el préstamo de "${itemName}"? Esta acción aplicará una cancelación lógica.`)) {
      try {
        await equipmentLoansService.delete(id);
        fetchLoans(); // Refresh the list
      } catch (err: any) {
        alert(err.message || "Error al cancelar el préstamo");
      }
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
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
                    disabled={!!editingLoanId} // Bloqueado si estamos editando
                    required
                  />
                </Field>
                <Field label="ID del Miembro (Socio)" required>
                  <Input 
                    placeholder="Ej. cluy123456..." 
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    disabled={!!editingLoanId} // Bloqueado si estamos editando
                    required
                  />
                </Field>
                <Field label="Fecha de Préstamo" required>
                  <Input 
                    type="date" 
                    value={formData.loan_date}
                    onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                    disabled={!!editingLoanId}
                    required
                  />
                </Field>
                <Field label="Fecha Límite de Devolución" required>
                  <Input 
                    type="date" 
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={!!editingLoanId}
                    required
                  />
                </Field>
                
                {editingLoanId && formData.status && (
                  <Field label="Estado del Préstamo" required>
                    <SelectRoot 
                      collection={statusCategories} 
                      value={[formData.status]}
                      onValueChange={(e) => setFormData({ ...formData, status: e.value[0] as EquipmentLoanStatus })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione el estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusCategories.items.map((stat) => (
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

      <Box 
        bg="bg.panel" 
        borderRadius="xl" 
        boxShadow="sm" 
        borderWidth="1px" 
        overflow="hidden"
        minH="300px"
        position="relative"
      >
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
                <Table.ColumnHeader py="4">ID Socio</Table.ColumnHeader>
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
                  <Table.Cell color="fg.muted" fontSize="sm">{loan.member_id}</Table.Cell>
                  <Table.Cell color="fg.muted">{loan.loan_date.split('T')[0]}</Table.Cell>
                  <Table.Cell color="fg.muted">{loan.due_date.split('T')[0]}</Table.Cell>
                  <Table.Cell>
                    <Box 
                      display="inline-block" 
                      px="2" 
                      py="0.5" 
                      borderRadius="md" 
                      bg={
                        loan.status === 'Returned' ? 'green.50' : 
                        loan.status === 'Loaned' ? 'blue.50' : 'red.50'
                      } 
                      color={
                        loan.status === 'Returned' ? 'green.700' : 
                        loan.status === 'Loaned' ? 'blue.700' : 'red.700'
                      } 
                      fontSize="xs" 
                      fontWeight="bold"
                    >
                      {loan.status === 'Loaned' ? 'Prestado' : 
                       loan.status === 'Returned' ? 'Devuelto' : 'Cancelado'}
                    </Box>
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <HStack gap="2" justify="flex-end">
                      <IconButton 
                        variant="ghost" 
                        size="sm" 
                        aria-label="Editar préstamo"
                        onClick={() => openEditModal(loan)}
                        disabled={loan.status === 'Canceled'} // No se edita si está cancelado
                      >
                        <LuPencil />
                      </IconButton>
                      <IconButton 
                        variant="ghost" 
                        size="sm" 
                        colorPalette="red" 
                        aria-label="Cancelar préstamo"
                        onClick={() => handleDeleteLoan(loan.id, loan.item_name)}
                        disabled={loan.status === 'Canceled'} // No se vuelve a cancelar
                      >
                        <LuTrash2 />
                      </IconButton>
                    </HStack>
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