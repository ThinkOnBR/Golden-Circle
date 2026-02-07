import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { analyzeEngagement, EngagementAnalysis } from '../services/geminiService';
import { Card, Badge, SectionHeader } from '../components/UI';
import { Icons } from '../components/Icons';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [aiAnalysis, setAiAnalysis] = useState<EngagementAnalysis | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // If user is null, we shouldn't be here (protected route), but TS needs check
  if (!user) return null;

  const runAiAnalysis = async (force = false) => {
    setLoadingAi(true);
    try {
      const stats = await dataService.getUserStats(user.id);
      const result = await analyzeEngagement({ ...stats, userId: user.id }, force);
      if (result) setAiAnalysis(result);
    } catch (e) {
      console.error("Failed to run AI analysis", e);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    runAiAnalysis(false);
  }, [user.id]);

  return (
    <div>
      <SectionHeader title={`Bem-vindo, ${user.name.split(' ')[0]}`} subtitle="Visão Geral do seu Impacto" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Contribuições', value: '12', color: 'text-white' },
          { label: 'Rank', value: '#4', color: 'text-gold-500' },
          { label: 'Pontos', value: '850', color: 'text-white' },
          { label: 'Presença', value: '100%', color: 'text-green-500' }
        ].map((stat, i) => (
          <Card key={i} className="text-center py-4 px-2">
            <div className={`text-3xl font-bold font-serif ${stat.color}`}>{stat.value}</div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden min-h-[200px]">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="text-gold-500 text-lg">✦</span> Gemini 3 Analysis
            </h3>
            <button 
              onClick={() => runAiAnalysis(true)} 
              disabled={loadingAi}
              className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-400 uppercase tracking-wider disabled:opacity-50"
            >
              {loadingAi ? 'Analisando...' : <><Icons.Refresh /> Atualizar</>}
            </button>
          </div>
          
          {loadingAi ? (
            <div className="flex flex-col items-center justify-center h-32 animate-pulse">
               <div className="w-12 h-12 rounded-full border-2 border-t-gold-500 border-zinc-800 animate-spin mb-4"></div>
               <span className="text-xs text-zinc-500 tracking-widest uppercase">Processando dados de engajamento...</span>
            </div>
          ) : aiAnalysis ? (
            <div className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                 <div>
                   <span className="text-zinc-500 text-xs uppercase block mb-1">Classificação</span>
                   <Badge color="bg-purple-900/30 text-purple-400 border-purple-900 text-sm px-3 py-1">{aiAnalysis.classification}</Badge>
                 </div>
                 <div className="text-right">
                   <span className="text-zinc-500 text-xs uppercase block mb-1">Ação Sugerida</span>
                   <span className="text-white font-serif font-bold text-sm border-b border-gold-600 pb-0.5">{aiAnalysis.suggestion}</span>
                 </div>
              </div>
              
              <div className="bg-zinc-900/50 p-4 rounded border-l-2 border-gold-600">
                <p className="text-zinc-300 text-sm italic leading-relaxed">
                  "{aiAnalysis.insight}"
                </p>
              </div>
              <div className="mt-2 text-right">
                 <span className="text-[10px] text-zinc-600">Última análise: {new Date(aiAnalysis.lastRun).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">
              Inicie a análise para ver seus insights.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-white font-bold mb-4">Ranking Mensal</h3>
          <ul className="space-y-3">
            {[
              { name: 'Arthur Pendragon', points: 1200, change: '+2' },
              { name: 'Lancelot du Lac', points: 980, change: '-1' },
              { name: 'Galahad', points: 850, change: '0' },
            ].map((u, i) => (
              <li key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`font-serif font-bold ${i === 0 ? 'text-gold-500' : 'text-zinc-500'}`}>0{i+1}</span>
                  <span className="text-zinc-300 text-sm">{u.name}</span>
                </div>
                <div className="text-zinc-500 text-xs font-mono">{u.points} pts</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};