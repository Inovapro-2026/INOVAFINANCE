import { useState, useEffect } from "react";
import { Link2, Copy, Check, Plus, Trash2, Users, Loader2, ToggleLeft, ToggleRight, Edit2, Ban, UserPlus, Percent, Mail, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AffiliateLink {
  id: string;
  affiliate_code: string;
  affiliate_link: string;
  commission_percent: number;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  times_used: number;
  affiliate_name?: string;
  affiliate_email?: string;
  total_revenue: number;
  total_indicados: number;
}

export function AdminAffiliateLinkGenerator() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  
  // Form fields
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("50");
  const [isActive, setIsActive] = useState(true);

  // Base URL for affiliate links
  const baseUrl = window.location.origin;

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'affiliate_links');

      if (error) throw error;

      if (data && data.length > 0 && data[0].value) {
        const parsedLinks = JSON.parse(data[0].value);
        // Ensure all links have the new fields with defaults
        const updatedLinks = parsedLinks.map((link: any) => ({
          ...link,
          is_blocked: link.is_blocked || false,
          affiliate_name: link.affiliate_name || '',
          affiliate_email: link.affiliate_email || '',
          total_revenue: link.total_revenue || 0,
          total_indicados: link.total_indicados || link.times_used || 0,
        }));
        setLinks(updatedLinks);
      }
    } catch (error) {
      console.error('Error loading affiliate links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLinks = async (newLinks: AffiliateLink[]) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'affiliate_links',
          value: JSON.stringify(newLinks),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      setLinks(newLinks);
      
      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'affiliate_link_updated',
          details: { links_count: newLinks.length }
        });
      }
    } catch (error) {
      console.error('Error saving affiliate links:', error);
      throw error;
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingLink(null);
    setAffiliateName("");
    setAffiliateEmail("");
    setCommissionPercent("50");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (link: AffiliateLink) => {
    setIsEditMode(true);
    setEditingLink(link);
    setAffiliateName(link.affiliate_name || "");
    setAffiliateEmail(link.affiliate_email || "");
    setCommissionPercent(link.commission_percent.toString());
    setIsActive(link.is_active);
    setIsModalOpen(true);
  };

  const handleSaveLink = async () => {
    setIsGenerating(true);
    try {
      if (isEditMode && editingLink) {
        // Update existing link
        const updatedLinks = links.map(link => 
          link.id === editingLink.id 
            ? { 
                ...link, 
                affiliate_name: affiliateName.trim(),
                affiliate_email: affiliateEmail.trim(),
                commission_percent: parseInt(commissionPercent) || 50,
                is_active: isActive,
              } 
            : link
        );
        await saveLinks(updatedLinks);
        toast.success("Link de afiliado atualizado com sucesso!");
      } else {
        // Generate new unique code (INV-XXXX format as requested)
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const code = `INV-${randomNum}`;
        
        const newLink: AffiliateLink = {
          id: crypto.randomUUID(),
          affiliate_code: code,
          affiliate_link: `${baseUrl}/subscribe?ref=${code}`,
          commission_percent: parseInt(commissionPercent) || 50,
          is_active: isActive,
          is_blocked: false,
          created_at: new Date().toISOString(),
          times_used: 0,
          affiliate_name: affiliateName.trim(),
          affiliate_email: affiliateEmail.trim(),
          total_revenue: 0,
          total_indicados: 0,
        };

        await saveLinks([...links, newLink]);
        toast.success("Link de afiliado gerado com sucesso!");
      }
      
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar link de afiliado");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleLinkStatus = async (linkId: string) => {
    try {
      const updatedLinks = links.map(link => 
        link.id === linkId ? { ...link, is_active: !link.is_active } : link
      );
      await saveLinks(updatedLinks);
      toast.success("Status do link atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const toggleBlockStatus = async (linkId: string) => {
    try {
      const link = links.find(l => l.id === linkId);
      const updatedLinks = links.map(l => 
        l.id === linkId ? { ...l, is_blocked: !l.is_blocked, is_active: l.is_blocked ? l.is_active : false } : l
      );
      await saveLinks(updatedLinks);
      toast.success(link?.is_blocked ? "Afiliado desbloqueado!" : "Afiliado bloqueado!");
    } catch (error) {
      toast.error("Erro ao atualizar bloqueio");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const updatedLinks = links.filter(link => link.id !== linkId);
      await saveLinks(updatedLinks);
      toast.success("Link removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover link");
    }
  };

  const copyToClipboard = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copiado com sucesso!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with prominent button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-white">
            <Link2 className="w-6 h-6 text-primary" />
            Gerenciamento de Afiliados
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Crie e gerencie links exclusivos para novos afiliados entrarem no sistema.
          </p>
        </div>
        
        {/* Main CTA Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={openCreateModal}
            size="lg"
            className="h-12 px-6 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold shadow-lg shadow-purple-500/25 transition-all duration-300"
          >
            <Link2 className="w-5 h-5 mr-2" />
            🔗 Gerar link de afiliado
          </Button>
        </motion.div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{links.length}</p>
              <p className="text-xs text-slate-400">Links Criados</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {links.reduce((sum, l) => sum + l.total_indicados, 0)}
              </p>
              <p className="text-xs text-slate-400">Total Indicados</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{links.filter(l => l.is_active).length}</p>
              <p className="text-xs text-slate-400">Links Ativos</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Affiliate Links Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h4 className="text-lg font-semibold text-white">Links de Afiliados</h4>
        </div>
        
        {links.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum link gerado ainda</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Clique no botão "Gerar link de afiliado" para criar seu primeiro link exclusivo para novos parceiros.
            </p>
            <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro link
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Nome / Código</TableHead>
                  <TableHead className="text-slate-400">Link</TableHead>
                  <TableHead className="text-slate-400 text-center">Comissão</TableHead>
                  <TableHead className="text-slate-400 text-center">Indicados</TableHead>
                  <TableHead className="text-slate-400 text-center">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {links.map((link) => (
                    <motion.tr
                      key={link.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-slate-700/50 ${link.is_blocked ? 'opacity-50' : ''} ${!link.is_active ? 'opacity-70' : ''}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {link.affiliate_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-primary font-mono font-bold">
                            {link.affiliate_code}
                          </p>
                          {link.affiliate_email && (
                            <p className="text-xs text-slate-500">{link.affiliate_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-xs">
                          <Input
                            value={link.affiliate_link}
                            readOnly
                            className="font-mono text-xs bg-slate-800/50 border-slate-700 h-8 text-slate-300"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => copyToClipboard(link.affiliate_link, link.id)}
                                >
                                  {copiedId === link.id ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar link</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-0">
                          {link.commission_percent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-white">{link.total_indicados}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {link.is_blocked ? (
                          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-0">
                            Bloqueado
                          </Badge>
                        ) : link.is_active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-0">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleLinkStatus(link.id)}
                                  disabled={link.is_blocked}
                                >
                                  {link.is_active ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{link.is_active ? 'Desativar' : 'Ativar'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditModal(link)}
                                >
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleBlockStatus(link.id)}
                                >
                                  <Ban className={`w-4 h-4 ${link.is_blocked ? 'text-orange-400' : 'text-slate-400'}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{link.is_blocked ? 'Desbloquear' : 'Bloquear'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => deleteLink(link.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                {isEditMode ? <Edit2 className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              </div>
              {isEditMode ? 'Editar Link de Afiliado' : 'Gerar Link de Afiliado'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {isEditMode 
                ? 'Atualize as informações do link de afiliado.'
                : 'Preencha os dados para criar um novo link exclusivo de afiliado.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Nome do afiliado (opcional)
              </Label>
              <Input
                value={affiliateName}
                onChange={(e) => setAffiliateName(e.target.value)}
                placeholder="Ex: João Silva"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">Apenas para controle interno do admin.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                E-mail do afiliado (opcional)
              </Label>
              <Input
                type="email"
                value={affiliateEmail}
                onChange={(e) => setAffiliateEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">Usado apenas para referência futura.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                Comissão (%)
              </Label>
              <Input
                type="number"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                placeholder="50"
                min="1"
                max="100"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">Porcentagem de comissão por indicação.</p>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
              <div>
                <Label className="text-white">Status do afiliado</Label>
                <p className="text-xs text-slate-500">Afiliado ativo pode gerar cadastros.</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLink}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isEditMode ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {isEditMode ? 'Salvar alterações' : 'Gerar link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
