import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Badge, Modal, Input, PasswordInput, TextArea } from '../components/UI';
import { Icons } from '../components/Icons';

export const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  if (!currentUser) return null;

  useEffect(() => {
    dataService.getAllUsers().then(setUsers);
  }, [editingUser]);

  const handleEdit = (user: User) => {
    setEditingUser(JSON.parse(JSON.stringify(user)));
  };

  const handleSave = async () => {
    if (editingUser) {
       await dataService.updateUser(editingUser);
       setEditingUser(null);
       dataService.getAllUsers().then(setUsers);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja remover este membro da confraria? Esta ação é irreversível na versão atual.")) {
      await dataService.deleteUser(userId);
      dataService.getAllUsers().then(setUsers);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingUser) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                 setEditingUser({ ...editingUser, avatarUrl: ev.target.result as string });
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div>
      <SectionHeader title="Administração Geral" subtitle="Gestão de Membros e Configurações" />
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="border-l-4 border-l-red-900">
           <h3 className="text-white font-bold mb-2">Ações Críticas</h3>
           <div className="space-y-2">
             <Button variant="secondary" className="w-full text-left text-xs">Resetar Senha de Usuário</Button>
             <Button variant="secondary" className="w-full text-left text-xs">Auditar Logs de Acesso</Button>
             <Button variant="secondary" className="w-full text-left text-xs">Alterar Termo Jurídico</Button>
           </div>
        </Card>
        <Card>
           <h3 className="text-white font-bold mb-2">Configurações da Plataforma</h3>
           <div className="space-y-2">
             <div className="flex justify-between items-center py-2 border-b border-zinc-800">
               <span className="text-zinc-400 text-sm">Novos cadastros</span>
               <span className="text-green-500 text-xs uppercase font-bold">Habilitado</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-zinc-800">
               <span className="text-zinc-400 text-sm">Votação Automática</span>
               <span className="text-green-500 text-xs uppercase font-bold">Ativo (80%)</span>
             </div>
           </div>
        </Card>
      </div>

      <h3 className="text-gold-500 font-serif text-lg tracking-widest mb-4">Base de Usuários</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900 text-zinc-200 uppercase font-bold text-xs">
            <tr>
              <th className="p-3 rounded-tl-lg">Nome</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-serif text-xs">{u.name[0]}</span>}
                  </div>
                  <div>
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-xs">{u.email}</div>
                  </div>
                </td>
                <td className="p-3"><Badge>{u.role}</Badge></td>
                <td className="p-3">
                  <span className={`w-2 h-2 inline-block rounded-full mr-2 ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {u.status}
                </td>
                <td className="p-3 flex items-center gap-2">
                  <button onClick={() => handleEdit(u)} className="text-gold-600 hover:text-gold-400 p-1" title="Editar Usuário"><Icons.Edit /></button>
                  {currentUser.role === UserRole.MASTER && currentUser.id !== u.id && (
                     <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-400 p-1" title="Excluir Usuário"><Icons.Trash /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuário">
        {editingUser && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="relative group cursor-pointer w-24 h-24">
                    <div className="w-24 h-24 rounded-full border-2 border-gold-500 overflow-hidden bg-zinc-800 flex items-center justify-center">
                        {editingUser.avatarUrl ? (
                            <img src={editingUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-serif text-gold-500">{editingUser.name[0]}</span>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                         onClick={() => document.getElementById('avatar-upload')?.click()}>
                        <Icons.Camera className="w-6 h-6 text-white" />
                    </div>
                </div>
                <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>

             <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nome Completo</label>
                  <Input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                </div>
                <div>
                   <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nível de Acesso</label>
                   <select 
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-zinc-200"
                      value={editingUser.role}
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                   >
                     <option value="MASTER">MASTER</option>
                     <option value="ADMIN">ADMIN</option>
                     <option value="PARTICIPANT">PARTICIPANT</option>
                   </select>
                </div>
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
               <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
               <Button onClick={handleSave}>Salvar Alterações</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};