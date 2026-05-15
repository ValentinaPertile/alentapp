import {
  Table,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  Input,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { paymentsService } from "../services/payments";
import type { PaymentDTO, CreatePaymentRequest } from "@alentapp/shared";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    amount: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    due_date: "",
    member_id: "",
  });

  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentsService.getAll();
      setPayments(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los pagos");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      amount: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      due_date: "",
      member_id: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await paymentsService.create(formData);
      setIsDialogOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || "Error al guardar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const statusColor = (status: string) => {
    if (status === "Paid") return { bg: "green.50", color: "green.700" };
    if (status === "Canceled") return { bg: "red.50", color: "red.700" };
    return { bg: "orange.50", color: "orange.700" };
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestioná los pagos de los socios del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchPayments} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Pago
            </Button>
          </HStack>
        </Flex>

        {/* Modal para registrar pago */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="ID del Socio" required>
                  <Input
                    placeholder="UUID del socio"
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Monto" required>
                  <Input
                    type="number"
                    placeholder="Ej. 1500"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Mes" required>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="1-12"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Año" required>
                  <Input
                    type="number"
                    placeholder="Ej. 2026"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Fecha de Vencimiento" required>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Registrar Pago
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
                <Text color="fg.muted">Cargando pagos</Text>
              </Stack>
            </Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron pagos.</Text>
                <Button variant="ghost" onClick={fetchPayments}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio ID</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Período</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de Pago</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payments.map((payment) => (
                  <Table.Row key={payment.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell color="fg.muted" fontSize="xs">{payment.member_id}</Table.Cell>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      ${payment.amount.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {payment.month}/{payment.year}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{payment.due_date}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={statusColor(payment.status).bg}
                        color={statusColor(payment.status).color}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {payment.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString()
                        : "-"}
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