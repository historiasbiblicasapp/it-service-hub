import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Copy } from "lucide-react";
import { toast } from "sonner";

const openWhatsApp = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Texto copiado! Cole no WhatsApp.");
  }).catch(() => {});
  
  // Try multiple WhatsApp URL schemes
  const encoded = encodeURIComponent(text);
  const w = window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
  if (!w) {
    // fallback: try wa.me
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }
};

const SharePage = () => {
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const shareAllServices = () => {
    const lines = services.map((s) => `✅ ${s.name} - R$ ${Number(s.cost).toFixed(2)}`);
    const text = `🖥️ *Serviços de TI Disponíveis*\n\n${lines.join("\n")}\n\n📞 Entre em contato para mais informações!`;
    openWhatsApp(text);
  };

  const shareSingleService = (name: string, cost: number, description: string | null) => {
    const text = `🖥️ *Oferta de Serviço de TI*\n\n✅ *${name}*\n${description || ""}\n💰 Valor: R$ ${cost.toFixed(2)}\n\n📞 Entre em contato para agendar!`;
    openWhatsApp(text);
  };

  const shareQuote = (name: string, cost: number) => {
    const text = `📋 *Orçamento de Serviço*\n\n🔧 Serviço: *${name}*\n💰 Valor estimado: R$ ${cost.toFixed(2)}\n\n⚠️ Valor sujeito a análise técnica.\n📞 Entre em contato para confirmar!`;
    openWhatsApp(text);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Texto copiado para a área de transferência!");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compartilhar via WhatsApp</h1>
        <p className="text-muted-foreground">Envie ofertas e orçamentos para seus clientes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-success" /> Enviar Lista Completa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Envie a lista completa de serviços disponíveis.</p>
          <div className="flex gap-2">
            <Button onClick={shareAllServices} className="bg-success hover:bg-success/90 text-success-foreground">
              <Send className="w-4 h-4 mr-2" /> Enviar todos os serviços
            </Button>
            <Button variant="outline" onClick={() => {
              const lines = services.map((s) => `✅ ${s.name} - R$ ${Number(s.cost).toFixed(2)}`);
              copyText(`🖥️ *Serviços de TI Disponíveis*\n\n${lines.join("\n")}\n\n📞 Entre em contato para mais informações!`);
            }}>
              <Copy className="w-4 h-4 mr-2" /> Copiar texto
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{service.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
              <Badge className="mb-4 bg-primary/10 text-primary border-0">R$ {Number(service.cost).toFixed(2)}</Badge>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => shareSingleService(service.name, Number(service.cost), service.description)}>
                  <Send className="w-3 h-3 mr-1" /> Oferta
                </Button>
                <Button size="sm" variant="outline" onClick={() => shareQuote(service.name, Number(service.cost))}>
                  <MessageCircle className="w-3 h-3 mr-1" /> Orçamento
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SharePage;
