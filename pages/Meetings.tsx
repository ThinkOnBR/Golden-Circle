import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Meeting, User, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Modal, Input, TextArea } from '../components/UI';
import { LEGAL_TERM_TEXT } from '../constants';
import { useToast } from '../components/Toast';
import { Icons } from '../components/Icons';

export const Meetings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // States for Logic
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null); // For RSVP Modal
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null); // For Edit/Create Modal
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    description: '', // Mapped to "Nome do Evento"
    location: '',    // "Local e Estado"
    time: '',
    date: ''
  });

  if (!user) return null;

  const isAdminOrMaster = user.role === UserRole.MASTER || user.role === UserRole.ADMIN;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const [fetchedMeetings, fetchedUsers] = await Promise.all([
        dataService.getMeetings(),
        dataService.getAllUsers()
    ]);
    // Ordenar reuniões por data (mais recente primeiro ou futuro primeiro)
    const sortedMeetings = fetchedMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setMeetings(sortedMeetings);
    setUsers(fetchedUsers);
  };

  // --- CRUD HANDLERS ---

  const handleOpenCreate = () => {
    setFormData({ description: '', location: '', time: '', date: '' });
    setIsCreating(true);
    setEditingMeeting(null);
  };

  const handleOpenEdit = (m: Meeting) => {
    setFormData({
        description: m.description,
        location: m.location,
        time: m.time,
        date: m.date
    });
    setEditingMeeting(m);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja cancelar e excluir este evento?")) {
        try {
            await dataService.deleteMeeting(id);
            addToast("Evento excluído.", "info");
            refreshData();
        } catch (e) {
            addToast("Erro ao excluir.", "error");
        }
    }
  };

  const handleSave = async () => {
    if (!formData.description || !formData.date || !formData.time || !formData.location) {
        addToast("Todos os campos são obrigatórios.", "error");
        return;
    }

    try {
        if (isCreating) {
            await dataService.createMeeting(formData);
            addToast("Evento criado com sucesso!", "success");
        } else if (editingMeeting) {
            await dataService.updateMeeting({ ...editingMeeting, ...formData });
            addToast("Evento atualizado.", "success");
        }
        setIsCreating(false);
        setEditingMeeting(null);
        refreshData();
    } catch (e) {
        console.error(e);
        addToast("Erro ao salvar evento.", "error");
    }
  };

  // --- RSVP HANDLER ---

  const handleRSVP = async () => {
    if (selectedMeeting) {
      await dataService.acceptMeetingTerm(selectedMeeting.id, user.id);
      addToast("Presença confirmada!", "success");
      refreshData();
      setSelectedMeeting(null);
    }
  };

  // --- CALENDAR HELPERS ---

  const getCalendarLinks = (m: Meeting) => {
    // Basic date parsing assumption: YYYY-MM-DD and HH:MM
    const startDateTime = new Date(`${m.date}T${m.time}`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // Assumes 2h duration

    const formatISO = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(m.description)}&dates=${formatISO(startDateTime)}/${formatISO(endDateTime)}&details=${encodeURIComponent(m.description)}&location=${encodeURIComponent(m.location)}`;

    const downloadIcs = () => {
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${googleUrl}
DTSTART:${formatISO(startDateTime)}
DTEND:${formatISO(endDateTime)}
SUMMARY:${m.description}
DESCRIPTION:${m.description}
LOCATION:${m.location}
END:VEVENT
END:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', 'evento_confraria.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return { googleUrl, downloadIcs };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <SectionHeader title="Reuniões & Assembleias" subtitle="Presença obrigatória para membros ativos" />
        {isAdminOrMaster && (
            <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                <Icons.Plus /> Novo Evento
            </Button>
        )}
      </div>

      <div className="space-y-6">
        {meetings.length === 0 && (
            <div className="text-center py-10 text-zinc-500">
                Nenhum evento agendado no momento.
            </div>
        )}

        {meetings.map(m => {
          const isConfirmed = m.termAcceptedBy && m.termAcceptedBy.includes(user.id);
          const { googleUrl, downloadIcs } = getCalendarLinks(m);
          
          // Get avatars of confirmed users
          const confirmedUsers = m.termAcceptedBy 
             ? m.termAcceptedBy.map(uid => users.find(u => u.id === uid)).filter(Boolean) as User[]
             : [];

          return (
            <Card key={m.id} className="relative overflow-hidden">
               {/* Admin Actions */}
               {isAdminOrMaster && (
                   <div className="absolute top-4 right-4 flex gap-2">
                       <button onClick={() => handleOpenEdit(m)} className="p-1 text-zinc-500 hover:text-gold-500 bg-zinc-900/50 rounded"><Icons.Edit /></button>
                       <button onClick={() => handleDelete(m.id)} className="p-1 text-zinc-500 hover:text-red-500 bg-zinc-900/50 rounded"><Icons.Trash /></button>
                   </div>
               )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Date Box */}
                <div className="flex md:flex-col items-center justify-center min-w-[100px] bg-zinc-900/30 rounded p-4 border border-zinc-800 shrink-0 gap-4 md:gap-0">
                   <div className="text-gold-500 font-serif text-3xl font-bold">{m.date.split('-')[2]}</div>
                   <div className="text-zinc-400 text-sm uppercase font-bold tracking-widest">{new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</div>
                   <div className="text-zinc-500 text-xs mt-1">{m.time}</div>
                </div>

                {/* Info */}
                <div className="flex-1 py-2 space-y-2">
                   <h3 className="text-white font-bold text-xl">{m.description}</h3>
                   <p className="text-zinc-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold-600"></span> {m.location}
                   </p>
                   
                   <div className="pt-4 flex flex-wrap gap-4 items-center">
                       {isConfirmed ? (
                           <div className="flex items-center gap-4 animate-fade-in-up">
                               <div className="flex flex-col">
                                   <span className="text-green-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                       <Icons.Check className="w-4 h-4" /> Presença Confirmada
                                   </span>
                                   <span className="text-[10px] text-zinc-600">Termo assinado digitalmente</span>
                               </div>
                               <div className="h-8 w-px bg-zinc-800 mx-2"></div>
                               <div className="flex gap-2">
                                   <a href={googleUrl} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white text-xs border border-zinc-700 px-2 py-1 rounded hover:border-white transition-colors">
                                       Google Agenda
                                   </a>
                                   <button onClick={downloadIcs} className="text-zinc-400 hover:text-white text-xs border border-zinc-700 px-2 py-1 rounded hover:border-white transition-colors">
                                       Baixar .ics
                                   </button>
                               </div>
                           </div>
                       ) : (
                           <Button onClick={() => setSelectedMeeting(m)}>Confirmar Presença</Button>
                       )}
                   </div>
                </div>
              </div>

              {/* Footer: Participants */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                 <div className="flex -space-x-2 overflow-hidden">
                    {confirmedUsers.slice(0, 8).map((u, i) => (
                        <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-bold overflow-hidden" title={u.name}>
                            {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.name[0]}
                        </div>
                    ))}
                    {confirmedUsers.length > 8 && (
                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                            +{confirmedUsers.length - 8}
                        </div>
                    )}
                    {confirmedUsers.length === 0 && (
                        <span className="text-xs text-zinc-600 italic pl-2">Seja o primeiro a confirmar!</span>
                    )}
                 </div>
                 {confirmedUsers.length > 0 && <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{confirmedUsers.length} Membros confirmados</span>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL DE TERMO (Confirmar Presença) */}
      <Modal isOpen={!!selectedMeeting} onClose={() => setSelectedMeeting(null)} title="Termo Jurídico Obrigatório">
        <div className="space-y-6">
          <div className="bg-black border border-zinc-800 p-4 rounded text-zinc-400 text-xs leading-relaxed font-mono h-48 overflow-y-auto">
            {LEGAL_TERM_TEXT}
          </div>
          <div className="flex items-center gap-3">
             <input type="checkbox" id="legal" className="accent-gold-500 w-5 h-5" onChange={(e) => { /* simple validation trigger */ }} />
             <label htmlFor="legal" className="text-sm text-zinc-300 cursor-pointer">Li e aceito os termos de confidencialidade e sigilo.</label>
          </div>
          <Button onClick={handleRSVP} className="w-full">Assinar Digitalmente e Confirmar</Button>
        </div>
      </Modal>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO (Admin) */}
      <Modal isOpen={isCreating || !!editingMeeting} onClose={() => { setIsCreating(false); setEditingMeeting(null); }} title={isCreating ? "Novo Evento" : "Editar Evento"}>
         <div className="space-y-4">
            <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nome do Evento</label>
                <Input 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Ex: Jantar de Negócios - Edição Outubro"
                />
            </div>
            
            <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Local e Estado</label>
                <Input 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    placeholder="Ex: Hotel Fasano, São Paulo - SP"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Dia</label>
                    <Input 
                        type="date"
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Hora</label>
                    <Input 
                        type="time"
                        value={formData.time} 
                        onChange={e => setFormData({...formData, time: e.target.value})} 
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => { setIsCreating(false); setEditingMeeting(null); }}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Evento</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};