import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle } from "lucide-react";

const Orders = () => {
  // Placeholder data
  const orders = [
    { id: "ORD001", customer: "Ana Silva", total: 150.00, date: "2024-10-20", status: "paid" },
    { id: "ORD002", customer: "Bruno Costa", total: 45.50, date: "2024-10-19", status: "pending" },
    { id: "ORD003", customer: "Carla Mendes", total: 320.99, date: "2024-10-18", status: "shipped" },
    { id: "ORD004", customer: "David Rocha", total: 88.00, date: "2024-10-17", status: "delivered" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'shipped':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500 hover:bg-green-600">Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    console.log(`Updating order ${orderId} status to ${newStatus}`);
    // Implementation to update Supabase table 'orders' goes here
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">Gestão de Pedidos</h1>
        <p className="text-md text-muted-foreground">Visualize e atualize o status dos pedidos da sua loja.</p>
      </header>

      <Card className="border-primary/50 hover:ring-2 hover:ring-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading">ID</TableHead>
                  <TableHead className="font-heading">Cliente</TableHead>
                  <TableHead className="font-heading">Total</TableHead>
                  <TableHead className="font-heading">Data</TableHead>
                  <TableHead className="font-heading">Status</TableHead>
                  <TableHead className="font-heading text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {order.status === 'paid' && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => handleUpdateStatus(order.id, 'shipped')}
                        >
                          <Truck className="h-4 w-4 mr-1" /> Enviar
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Entregue
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;