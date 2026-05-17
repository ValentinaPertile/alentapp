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
  Input,
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { lockersService } from "../services/lockers";
import type {
  LockerDTO,
  CreateLockerRequest,
  UpdateLockerRequest,
  LockerLocation,
  LockerStatus,
} from "@alentapp/shared";
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
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from "../components/ui/select";

const lockerLocations = createListCollection({
  items: [
    { label: "Hall", value: "Hall" },
    { label: "Vestíbulo", value: "Vestibulo" },
    { label: "Pasillo", value: "Pasillo" },
    { label: "Gimnasio", value: "Gimnasio" },
    { label: "Administración", value: "Administracion" },
  ],
});

const lockerStatuses = createListCollection({
  items: [
    { label: "Disponible", value: "Available" },
    { label: "Asignado", value: "Assigned" },
    { label: "Mantenimiento", value: "Maintenance" },
  ],
});

const initialFormData: CreateLockerRequest & {
  status: LockerStatus;
  member_id: string | null;
} = {
  number: 1,
  location: "Hall",
  status: "Available",
  member_id: null,
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);

  const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await lockersService.getAll();
      setLockers(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los casilleros");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLockerId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setEditingLockerId(locker.id);
    setFormData({
      number: locker.number,
      location: locker.location,
      status: locker.status,
      member_id: locker.member_id,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingLockerId) {
        const payload: UpdateLockerRequest = {
          number: Number(formData.number),
          location: formData.location,
          status: formData.status,
          member_id: formData.member_id || null,
        };

        await lockersService.update(editingLockerId, payload);
      } else {
        const payload: CreateLockerRequest = {
          number: Number(formData.number),
          location: formData.location,
        };

        await lockersService.create(payload);
      }

      setIsDialogOpen(false);
      fetchLockers();
    } catch (err: any) {
      alert(err.message || "Error al guardar el casillero");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocker = async (locker: LockerDTO) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas dar de baja el casillero N° ${locker.number}?`
      )
    ) {
      try {
        await lockersService.delete(locker.id);
        fetchLockers();
      } catch (err: any) {
        alert(err.message || "Error al dar de baja el casillero");
      }
    }
  };

  useEffect(() => {
    fetchLockers();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">
              Administración de Casilleros
            </Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona la disponibilidad, ubicación y asignación de casilleros.
            </Text>
          </Stack>

          <HStack gap="3">
            <Button variant="outline" onClick={fetchLockers} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Casillero
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingLockerId ? "Editar Casillero" : "Agregar Nuevo Casillero"}
              </DialogTitle>
            </DialogHeader>

            <DialogBody>
              <Stack gap="4">
                <Field label="Número" required>
                  <Input
                    type="number"
                    min={1}
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: Number(e.target.value) })
                    }
                    required
                  />
                </Field>

                <Field label="Ubicación" required>
                  <SelectRoot
                    collection={lockerLocations}
                    value={[formData.location]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.value[0] as LockerLocation,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione una ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockerLocations.items.map((location) => (
                        <SelectItem item={location} key={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                {editingLockerId && (
                  <>
                    <Field label="Estado" required>
                      <SelectRoot
                        collection={lockerStatuses}
                        value={[formData.status]}
                        onValueChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.value[0] as LockerStatus,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {lockerStatuses.items.map((status) => (
                            <SelectItem item={status} key={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>

                    <Field label="ID del socio asignado">
                      <Input
                        placeholder="UUID del socio o vacío si está disponible"
                        value={formData.member_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            member_id: e.target.value || null,
                          })
                        }
                      />
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>

            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLockerId ? "Guardar Cambios" : "Crear Casillero"}
              </Button>
            </DialogFooter>

            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box
            p="4"
            bg="red.50"
            color="red.700"
            borderRadius="md"
            border="1px solid"
            borderColor="red.200"
          >
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
                <Text color="fg.muted">Cargando casilleros...</Text>
              </Stack>
            </Center>
          ) : lockers.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron casilleros.</Text>
                <Button variant="ghost" onClick={fetchLockers}>
                  Reintentar
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Número</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicación</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio asignado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">
                    Acciones
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {lockers.map((locker) => (
                  <Table.Row key={locker.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {locker.number}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.location}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={locker.status === "Available" ? "green.50" : "orange.50"}
                        color={locker.status === "Available" ? "green.700" : "orange.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {locker.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {locker.member_id || "Sin asignar"}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar casillero"
                          onClick={() => openEditModal(locker)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Dar de baja casillero"
                          onClick={() => handleDeleteLocker(locker)}
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