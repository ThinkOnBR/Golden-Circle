import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Candidate, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Badge, Modal, Input, TextArea } from '../components/UI';
import { Icons } from '../components/Icons';
import { useToast } from '../components/Toast';

export const Members: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{name:string, email:string, phone:string, companies:string[], bio:string, revenueRange:string}>({
    name: '', email: '', phone: '', companies: [''], bio: '', revenueRange: ''
  });

  if (!user) return null;

  const refreshData = () => {
    dataService.getCandidates().then(setCandidates);
    setActiveCount(dataService.getActiveMemberCount());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleVote = async (id: string, type: 'APPROVE' | 'VETO') => {
    const promoted = await dataService.voteCandidate(id, user.id, type);
    refreshData();
    if (promoted) {
      addToast('Candidato aprovado e promovido a membro oficial!', 'success');
    } else {
      addToast('Seu voto foi registrado.', 'info');
    }
  };

  const handleIndicate = async () => {
    if (!formData.name || !formData.email) {
      addToast('Nome e E-mail são obrigatórios', 'error');
      return;
    }
    await dataService.addCandidate(formData, user);
    setIsModalOpen(false);
    setFormData({ name: '', email: '', phone: '', companies: [''], bio: '', revenueRange: '' });
    refreshData();
    addToast('Candidato indicado para avaliação do comitê.', 'success');
  };

  const handleCompanyChange = (index: number, value: string) => {
    const newCompanies = [...formData.companies];
    newCompanies[index] = value;
    setFormData({ ...formData, companies: newCompanies });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <SectionHeader title="Novos Membros" subtitle="Indicação e Aprovação Coletiva" />
         {(user.role === UserRole.MASTER || user.role === UserRole.ADMIN) && (
           <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
             <Icons.Plus /> Indicar Membro
           </Button>
         )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {candidates.map(c => {
          const votesFor = Object.values(c.votes).filter(v => v === 'APPROVE').length;
          const approvalRate = activeCount > 0 ? Math.round((votesFor / activeCount) * 100) : 0;
          const myVote = c.votes[user.id];

          return (
            <Card key={c.id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-bold text-lg">{c.name}</h4>
                  <p className="text-zinc-400 text-sm">{c.companies[0]} {c.companies.length > 1 && `+${c.companies.length - 1}`}</p>
                </div>
                <Badge color="bg-blue-900/30 text-blue-400 border-blue-900">Em Votação</Badge>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded mb-4 text-sm text-zinc-300">
                <p className="mb-2"><strong className="text-zinc-500 uppercase text-xs">Faturamento:</strong> {c.revenueRange}</p>
                <p><strong className="text-zinc-500 uppercase text-xs">Bio:</strong> {c.bio}</p>
                {c.companies.length > 1 && (
                  <p className="mt-2 text-xs text-zinc-500">Outras empresas: {c.companies.slice(1).join(', ')}</p>
                )}
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Aprovação ({votesFor}/{activeCount} ativos)</span>
                  <span>{approvalRate}% (Meta: 80%)</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gold-500 h-full transition-all duration-500" style={{ width: `${approvalRate}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={myVote === 'VETO' ? 'danger' : 'secondary'} 
                  onClick={() => handleVote(c.id, 'VETO')}
                  className={myVote === 'VETO' ? "border-red-500 bg-red-900/40 text-red-500" : ""}
                >
                  {myVote === 'VETO' ? 'Vetado (Clique p/ retirar)' : 'Vetar'}
                </Button>
                <Button 
                   variant={myVote === 'APPROVE' ? 'primary' : 'secondary'}
                   onClick={() => handleVote(c.id, 'APPROVE')}
                   className={myVote === 'APPROVE' ? "bg-gold-500 text-black border-gold-500" : "hover:border-green-500 hover:text-green-500"}
                >
                  {myVote === 'APPROVE' ? 'Aprovado (Clique p/ retirar)' : 'Aprovar'}
                </Button>
              </div>
            </Card>
          );
        })}
        {candidates.length === 0 && (
          <p className="text-zinc-500 col-span-2 text-center py-8">Nenhum candidato em avaliação no momento.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Indicar Novo Membro">
         <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            <Input placeholder="Nome Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <Input placeholder="E-mail Corporativo" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <Input placeholder="Telefone / WhatsApp" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">Empresas</label>
              {formData.companies.map((comp, idx) => (
                <div key={idx} className="flex gap-2">
                   <Input placeholder={`Empresa ${idx + 1}`} value={comp} onChange={e => handleCompanyChange(idx, e.target.value)} />
                   {idx > 0 && <button onClick={() => setFormData({...formData, companies: formData.companies.filter((_, i) => i !== idx)})} className="text-red-500"><Icons.Trash /></button>}
                </div>
              ))}
              <button onClick={() => setFormData({ ...formData, companies: [...formData.companies, ''] })} className="text-xs text-gold-500 hover:underline">+ Adicionar outra empresa</button>
            </div>

            <Input placeholder="Faixa de Faturamento Mensal" value={formData.revenueRange} onChange={e => setFormData({...formData, revenueRange: e.target.value})} />
            <TextArea placeholder="Mini Currículo / Bio" rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
            
            <div className="flex justify-end gap-2 pt-4">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
               <Button onClick={handleIndicate}>Submeter para Votação</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};