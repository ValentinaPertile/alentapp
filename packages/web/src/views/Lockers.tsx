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
import { membersService } from "../services/members";
import type {
  LockerDTO,
  CreateLockerRequest,
  UpdateLockerRequest,
  LockerLocation,
  LockerStatus,
  MemberDTO,
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

const lockerStatusFilters = createListCollection({
  items: [
    { label: "Todos los estados", value: "All" },
    { label: "Disponible", value: "Available" },
    { label: "Asignado", value: "Assigned" },
    { label: "Mantenimiento", value: "Maintenance" },
  ],
});

const lockerLocationFilters = createListCollection({
  items: [
    { label: "Todas las ubicaciones", value: "All" },
    { label: "Hall", value: "Hall" },
    { label: "Vestíbulo", value: "Vestibulo" },
    { label: "Pasillo", value: "Pasillo" },
    { label: "Gimnasio", value: "Gimnasio" },
    { label: "Administración", value: "Administracion" },
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
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);

  const [numberSearch, setNumberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LockerStatus | "All">("All");
  const [locationFilter, setLocationFilter] = useState<LockerLocation | "All">("All");

  const activeMembers = members.filter((member) => {
    const status = String(member.status).toLowerCase();
    return status !== "cancelado" && status !== "canceled";
  });

  const memberOptions = createListCollection({
    items: [
      { label: "Sin asignar", value: "none" },
      ...activeMembers.map((member) => ({
        label: `${member.name} — DNI: ${member.dni}`,
        value: member.id,
      })),
    ],
  });

  const getMemberNameById = (memberId: string | null) => {
  if (!memberId) {
    return "Sin asignar";
  }

  const member = members.find((item) => item.id === memberId);

  if (!member) {
    return "Socio no encontrado";
  }

  return `${member.name} — DNI: ${member.dni}`;
};

  const filteredLockers = lockers.filter((locker) => {
    const matchesNumber =
      numberSearch.trim() === "" ||
      locker.number.toString().includes(numberSearch.trim());

    const matchesStatus = statusFilter === "All" || locker.status === statusFilter;

    const matchesLocation =
      locationFilter === "All" || locker.location === locationFilter;

    return matchesNumber && matchesStatus && matchesLocation;
  });

  const clearFilters = () => {
    setNumberSearch("");
    setStatusFilter("All");
    setLocationFilter("All");
  };

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

  const fetchMembers = async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch (err: any) {
      alert(err.message || "Error al cargar los socios");
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
    fetchMembers();
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

        <Box p="4" bg="bg.panel" borderRadius="xl" borderWidth="1px">
          <Stack gap="4">
            <Flex justify="space-between" align="center">
              <Stack gap="0">
                <Text fontWeight="semibold">Filtros de búsqueda</Text>
                <Text color="fg.muted" fontSize="sm">
                  Mostrando {filteredLockers.length} de {lockers.length} casilleros
                </Text>
              </Stack>

              <Button variant="ghost" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </Flex>

            <Flex gap="4" align="end" wrap="wrap">
              <Box minW="180px">
                <Field label="Buscar por número">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ej: 3"
                    value={numberSearch}
                    onChange={(e) => setNumberSearch(e.target.value)}
                  />
                </Field>
              </Box>

              <Box minW="220px">
                <Field label="Estado">
                  <SelectRoot
                    collection={lockerStatusFilters}
                    value={[statusFilter]}
                    onValueChange={(e) =>
                      setStatusFilter(e.value[0] as LockerStatus | "All")
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockerStatusFilters.items.map((status) => (
                        <SelectItem item={status} key={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
              </Box>

              <Box minW="220px">
                <Field label="Ubicación">
                  <SelectRoot
                    collection={lockerLocationFilters}
                    value={[locationFilter]}
                    onValueChange={(e) =>
                      setLocationFilter(e.value[0] as LockerLocation | "All")
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione una ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockerLocationFilters.items.map((location) => (
                        <SelectItem item={location} key={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
              </Box>
            </Flex>
          </Stack>
        </Box>

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

                    <Field label="Socio asignado">
                      <SelectRoot
                        collection={memberOptions}
                        value={[formData.member_id || "none"]}
                        onValueChange={(e) => {
                          const selectedMemberId = e.value[0];

                          setFormData({
                            ...formData,
                            member_id:
                              selectedMemberId === "none" ? null : selectedMemberId,
                            status:
                              selectedMemberId === "none" ? "Available" : "Assigned",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un socio" />
                        </SelectTrigger>

                        <SelectContent>
                          {memberOptions.items.map((member) => (
                            <SelectItem item={member} key={member.value}>
                              {member.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
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
          ) : filteredLockers.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">
                  No hay casilleros que coincidan con los filtros seleccionados.
                </Text>
                <Button variant="ghost" onClick={clearFilters}>
                  Limpiar filtros
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
                {filteredLockers.map((locker) => (
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
                        color={
                          locker.status === "Available" ? "green.700" : "orange.700"
                        }
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {locker.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                       {getMemberNameById(locker.member_id)}
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