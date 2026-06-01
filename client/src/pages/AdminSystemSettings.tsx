import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState({
    siteName: "Lumi Educa",
    siteDescription: "Plataforma educacional de escrita criativa",
    maxBooksPerStudent: 10,
    maxPagesPerBook: 250,
    enableAI: true,
    aiModel: "modelo-pedagogico-interno",
    aiTemperature: 0.7,
    enableNotifications: true,
    maintenanceMode: false,
    backupFrequency: "daily",
    maxUploadSize: 50,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem("systemSettings", JSON.stringify(settings));
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("systemSettings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar configurações", e);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600 mt-2">Parâmetros globais e configurações de IA</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="siteName">Nome do Site</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              placeholder="Nome do site"
            />
          </div>

          <div>
            <Label htmlFor="siteDescription">Descrição do Site</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              placeholder="Descrição breve do site"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxBooks">Máx. Livros por Aluno</Label>
              <Input
                id="maxBooks"
                type="number"
                value={settings.maxBooksPerStudent}
                onChange={(e) => setSettings({ ...settings, maxBooksPerStudent: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="maxPages">Máx. Páginas por Livro</Label>
              <Input
                id="maxPages"
                type="number"
                value={settings.maxPagesPerBook}
                onChange={(e) => setSettings({ ...settings, maxPagesPerBook: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="maxUpload">Tamanho Máximo de Upload (MB)</Label>
            <Input
              id="maxUpload"
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de IA Pedagógica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableAI">Habilitar IA Pedagógica</Label>
            <Switch
              id="enableAI"
              checked={settings.enableAI}
              onCheckedChange={(checked) => setSettings({ ...settings, enableAI: checked })}
            />
          </div>

          {settings.enableAI && (
            <>
              <div>
                <Label htmlFor="aiModel">Modelo de IA</Label>
                <select
                  id="aiModel"
                  value={settings.aiModel}
                  onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="modelo-pedagogico-interno">Modelo pedagógico interno</option>
                  <option value="modelo-revisao-gramatical">Revisão gramatical</option>
                  <option value="modelo-relatorios">Relatórios pedagógicos</option>
                </select>
              </div>

              <div>
                <Label htmlFor="aiTemp">Temperatura de IA ({settings.aiTemperature})</Label>
                <input
                  id="aiTemp"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.aiTemperature}
                  onChange={(e) => setSettings({ ...settings, aiTemperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-sm text-gray-600 mt-1">Mais baixo = mais determinístico, Mais alto = mais criativo</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableNotifications">Habilitar Notificações</Label>
            <Switch
              id="enableNotifications"
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Manutenção do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="maintenance">Modo de Manutenção</Label>
            <Switch
              id="maintenance"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>

          <div>
            <Label htmlFor="backupFreq">Frequência de Backup</Label>
            <select
              id="backupFreq"
              value={settings.backupFrequency}
              onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="hourly">A cada hora</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
