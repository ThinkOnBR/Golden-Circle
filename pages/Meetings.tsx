import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Meeting } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Modal } from '../components/UI';
import { LEGAL_TERM_TEXT } from '../constants';

export const Meetings: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  if (!user) return null;

  useEffect(() => {
    dataService.getMeetings().then(setMeetings);
  }, []);

  const handleRSVP = async () => {
    if (selectedMeeting) {
      await dataService.acceptMeetingTerm(selectedMeeting.id, user.id);
      setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? {...m, termAcceptedBy: [...m.termAcceptedBy, user.id]} : m));
      setSelectedMeeting(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Reuniões & Assembleias" subtitle="Presença obrigatória para membros ativos" />
      <div className="space-y-4">
        {meetings.map(m => {
          const isConfirmed = m.termAcceptedBy.includes(user.id);
          return (
            <Card key={m.id} className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <div className="text-gold-500 font-serif text-2xl font-bold">{m.date.split('-')[2]}/{m.date.split('-')[1]}</div>
                <div className="text-zinc-500 text-sm uppercase">{m.time}</div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-white font-bold text-lg">{m.description}</h3>
                <p className="text-zinc-400 text-sm flex items-center justify-center md:justify-start gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-600"></span> {m.location}
                </p>
              </div>
              <div>
                {isConfirmed ? (
                  <div className="flex flex-col items-center">
                    <span className="text-green-500 text-xs font-bold uppercase tracking-wider mb-1">Presença Confirmada</span>
                    <span className="text-zinc-600 text-[10px]">Termo Aceito</span>
                  </div>
                ) : (
                  <Button onClick={() => setSelectedMeeting(m)}>Confirmar Presença</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

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
    </div>
  );
};