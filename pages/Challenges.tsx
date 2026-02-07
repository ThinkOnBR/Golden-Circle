import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Challenge } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Badge, Modal, TextArea } from '../components/UI';
import { Icons } from '../components/Icons';

export const Challenges: React.FC = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  
  // Contribution State
  const [contributingChallenge, setContributingChallenge] = useState<Challenge | null>(null);
  const [contributionText, setContributionText] = useState('');
  const [detectedType, setDetectedType] = useState<'CONTACT' | 'ADVICE' | null>(null);

  if (!user) return null;

  useEffect(() => {
    dataService.getChallenges().then(setChallenges);
  }, []);

  const handleCreate = async () => {
    if (!newContent) return;
    const challenge = await dataService.createChallenge(newContent, user);
    setChallenges([challenge, ...challenges]);
    setNewContent('');
    setIsModalOpen(false);
  };

  const handleFinishChallenge = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Deseja realmente marcar este desafio como concluído?')) {
      await dataService.closeChallenge(id);
      const updated = await dataService.getChallenges();
      setChallenges([...updated]); 
    }
  };

  const openContributionModal = (challenge: Challenge) => {
    setContributingChallenge(challenge);
    setContributionText('');
    setDetectedType(null);
  };

  const toggleContributions = (id: string) => {
    if (expandedChallengeId === id) {
      setExpandedChallengeId(null);
    } else {
      setExpandedChallengeId(id);
    }
  };

  const handleContributionChange = (text: string) => {
    setContributionText(text);
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\(?\d{2}\)?\s)?(\d{4,5}\-?\d{4})/;
    if (emailRegex.test(text) || phoneRegex.test(text)) {
      setDetectedType('CONTACT');
    } else if (text.length > 5) {
      setDetectedType('ADVICE');
    } else {
      setDetectedType(null);
    }
  };

  const submitContribution = async () => {
    if (!contributingChallenge || !contributionText) return;
    await dataService.addContribution(contributingChallenge.id, contributionText, user);
    const updated = await dataService.getChallenges();
    setChallenges([...updated]);
    setContributingChallenge(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <SectionHeader title="Desafios de Negócio" subtitle="Conecte-se e resolva problemas reais" />
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Icons.Plus /> Novo Desafio
        </Button>
      </div>

      <div className="grid gap-6">
        {challenges.map(c => {
          const isExpanded = expandedChallengeId === c.id;
          const hasContributions = c.contributions && c.contributions.length > 0;
          
          return (
            <Card key={c.id} className={`border-l-4 ${c.status === 'OPEN' ? 'border-l-gold-600' : 'border-l-zinc-700 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gold-500 font-serif overflow-hidden border border-zinc-700">
                     <span>{c.authorName[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{c.authorName}</h3>
                    <p className="text-zinc-500 text-xs">{c.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.status === 'OPEN' && c.authorId === user.id && (
                    <button 
                      onClick={(e) => handleFinishChallenge(e, c.id)}
                      className="flex items-center gap-1 text-[10px] border border-gold-900 text-gold-600 px-2 py-1 rounded hover:bg-gold-900/20 transition-colors uppercase font-bold"
                    >
                      <Icons.Check /> Concluir
                    </button>
                  )}
                  <Badge color={c.status === 'OPEN' ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-zinc-800'}>
                    {c.status === 'OPEN' ? 'EM ANDAMENTO' : 'CONCLUÍDO'}
                  </Badge>
                </div>
              </div>
              <p className="text-zinc-300 mb-6 text-lg leading-relaxed">{c.content}</p>
              
              <div className="flex flex-wrap gap-4 border-t border-white/5 pt-4 items-center">
                <div className="flex gap-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">
                    <span className="text-white font-bold text-sm mr-1">{c.contactCount}</span> Contatos
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">
                    <span className="text-white font-bold text-sm mr-1">{c.adviceCount}</span> Conselhos
                  </div>
                </div>

                <div className="flex-1 flex justify-end gap-3">
                  {hasContributions && (
                    <button 
                      onClick={() => toggleContributions(c.id)}
                      className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 uppercase tracking-wider"
                    >
                      {isExpanded ? 'Ocultar' : 'Ver'} Contribuições
                      {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                  )}
                  
                  {c.status === 'OPEN' && (
                    <button 
                      onClick={() => openContributionModal(c)}
                      className="text-gold-500 text-xs font-bold hover:underline uppercase tracking-widest ml-2"
                    >
                      CONTRIBUIR
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA DE CONTRIBUIÇÕES EXPANDIDA */}
              {isExpanded && hasContributions && (
                <div className="mt-4 pt-4 border-t border-dashed border-zinc-800 space-y-3 animate-fade-in-up">
                   {c.contributions.map(contrib => (
                     <div key={contrib.id} className="bg-black/40 rounded p-3 border border-zinc-800/50">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 border border-zinc-700">
                                {contrib.authorName[0]}
                             </div>
                             <span className="text-xs text-zinc-300 font-bold">{contrib.authorName}</span>
                           </div>
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                             contrib.type === 'CONTACT' 
                               ? 'text-blue-400 border-blue-900 bg-blue-900/10' 
                               : 'text-purple-400 border-purple-900 bg-purple-900/10'
                           }`}>
                             {contrib.type === 'CONTACT' ? 'Contato' : 'Conselho'}
                           </span>
                        </div>
                        <p className="text-sm text-zinc-400 pl-8">{contrib.content}</p>
                     </div>
                   ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Desafio">
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">Descreva seu desafio atual. Seja específico sobre o que precisa (conexão, conselho técnico, contratação).</p>
          <TextArea 
            rows={5} 
            placeholder="Ex: Preciso de introdução ao Diretor de Compras da Empresa X..." 
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Publicar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!contributingChallenge} onClose={() => setContributingChallenge(null)} title="Contribuir com o Desafio">
        <div className="space-y-4">
           {contributingChallenge && (
             <div className="bg-zinc-900/50 p-3 rounded mb-4 text-xs italic text-zinc-400 border-l-2 border-zinc-700">
               "{contributingChallenge.content}"
             </div>
           )}
           <p className="text-zinc-300 text-sm">
             Compartilhe um contato valioso ou um conselho estratégico.
             <br />
             <span className="text-[10px] text-zinc-500 uppercase">O sistema detectará automaticamente se é um contato ou conselho.</span>
           </p>
           
           <TextArea 
             rows={4}
             placeholder="Digite aqui... (Se inserir e-mail ou telefone, será classificado como Contato)"
             value={contributionText}
             onChange={(e) => handleContributionChange(e.target.value)}
           />

           <div className="flex items-center justify-between h-6">
              {detectedType && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  detectedType === 'CONTACT' 
                    ? 'text-blue-400 border-blue-900 bg-blue-900/20' 
                    : 'text-purple-400 border-purple-900 bg-purple-900/20'
                }`}>
                  Detectado: {detectedType === 'CONTACT' ? 'Contato' : 'Conselho'}
                </span>
              )}
           </div>

           <div className="flex justify-end gap-2 pt-2">
             <Button variant="secondary" onClick={() => setContributingChallenge(null)}>Cancelar</Button>
             <Button onClick={submitContribution} disabled={!contributionText}>Enviar Contribuição</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};