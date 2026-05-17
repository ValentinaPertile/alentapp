import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { LuCreditCard, LuUsers, LuBox, LuFolder } from "react-icons/lu";
import { SectionCard } from "../components/SectionCard";

export function HomeView() {
  return (
    <Box>
      <VStack gap="6" align="flex-start" mb="12">
        <Heading 
          size="4xl" 
          fontWeight="extrabold" 
          letterSpacing="tight"
          bgGradient="to-r"
          gradientFrom="blue.600"
          gradientTo="cyan.400"
          bgClip="text"
        >
          Bienvenido a Alentapp
        </Heading>
        <Text fontSize="xl" color="fg.muted" maxW="2xl">
          El panel de administración central para gestionar todos los aspectos de tu club. 
          Selecciona una sección a continuación para comenzar.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 2 }} gap="8">
        <SectionCard 
          title="Miembros"
          description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
          to="/members"
          icon={LuUsers}
        />
        
        <SectionCard
          title="Préstamos de Equipamiento"
          description="Controlá el stock, retiro y devolución de materiales de hockey con validaciones y alertas límites."
          to="/equipment-loans"
          icon={LuFolder}
        />

        <SectionCard
          title="Casilleros"
          description="Gestiona el alta, modificación, disponibilidad y baja lógica de los casilleros del club."
          to="/lockers"
          icon={LuBox}
        />

        <SectionCard
          title="Pagos"
          description="Registrá y gestioná los pagos de los socios, controlá estados y vencimientos."
          to="/payments"
          icon={LuCreditCard}
        />
      </SimpleGrid>
    </Box>
  );
}