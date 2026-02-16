
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { SectionHeader, Button, Card, Badge, Modal, Input, PasswordInput, TextArea } from '../components/UI';
import { Icons } from '../components/Icons';
import { useToast } from '../components/Toast';

export const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  if (!currentUser) return null;

  useEffect(() => {
    dataService.getAllUsers().then(fetchedUsers => {
      if (currentUser.role === UserRole.PARTICIPANT) {
        setUsers(fetchedUsers.filter(u => u.id === currentUser.id));
      } else {
        setUsers(fetchedUsers);
      }
    });
  }, [editingUser, currentUser.id, currentUser.role]);

  const handleEdit = (user: User) => {
    const safeUser = {
      ...user,
      companies: user.companies || [user.company || ''],
      revenue: user.revenue || '',
      bio: user.bio || '',
      phone: user.phone || ''
    };
    setEditingUser(JSON.parse(JSON.stringify(safeUser)));
    setNewPassword('');
  };

  const handleSave = async () => {
    if (editingUser) {
       try {
         const userToUpdate = { ...editingUser };
         if (userToUpdate.companies && userToUpdate.companies.length > 0) {
            userToUpdate.company = userToUpdate.companies[0];
         }
         await dataService.updateUser(userToUpdate);

         if (newPassword) {
            if (currentUser.id === editingUser.id) {
               await dataService.changeUserPassword(newPassword);
               addToast('Seu perfil e sua NOVA SENHA foram atualizados!', 'success');
            } else {
               // Feedback visual claro sobre a limitação do Client SDK para senhas de terceiros
               addToast('Dados do membro salvos. Para alterar a senha deste membro, utilize o botão "Enviar E-mail de Redefinição".', 'info');
            }
         } else {
            addToast('Dados salvos com sucesso.', 'success');
         }

         setEditingUser(null);
       } catch (error: any) {
         addToast('Erro ao atualizar: ' + error.message, 'error');
       }
    }
  };

  const handleDelete = async (userId: string) => {
    const isSelf = currentUser.id === userId;
    const confirmMsg = isSelf 
      ? "Deseja realmente encerrar sua conta?"
      : "Tem certeza que deseja remover este membro?";

    if (window.confirm(confirmMsg)) {
      try {
        await dataService.deleteUser(userId);
        addToast(isSelf ? 'Conta encerrada.' : 'Membro removido.', 'success');
        if (isSelf) window.location.reload(); 
        else {
            const updated = await dataService.getAllUsers();
            setUsers(updated);
        }
      } catch (e: any) {
        addToast('Erro ao remover: ' + e.message, 'error');
      }
    }
  };

  const handleSendPasswordReset = async () => {
     if (editingUser) {
        try {
           await dataService.recoverPassword(editingUser.email);
           addToast(`E-mail de redefinição enviado para ${editingUser.email}. Verifique a caixa de entrada do membro.`, 'success');
        } catch (e) {
           addToast('Erro ao enviar e-mail de recuperação.', 'error');
        }
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

  const handleAddCompany = () => {
    if (editingUser) {
      setEditingUser({ ...editingUser, companies: [...editingUser.companies, ''] });
    }
  };

  const handleCompanyChange = (index: number, val: string) => {
    if (editingUser) {
      const newCompanies = [...editingUser.companies];
      newCompanies[index] = val;
      setEditingUser({ ...editingUser, companies: newCompanies });
    }
  };

  const handleRemoveCompany = (index: number) => {
    if (editingUser) {
      const newCompanies = editingUser.companies.filter((_, i) => i !== index);
      setEditingUser({ ...editingUser, companies: newCompanies });
    }
  };

  const canDelete = (targetUser: User) => {
    if (currentUser.role === UserRole.MASTER) return true;
    if (currentUser.role === UserRole.ADMIN && targetUser.role === UserRole.PARTICIPANT) return true;
    if (currentUser.id === targetUser.id) return true;
    return false;
  };

  const canEdit = (targetUser: User) => {
     if (currentUser.role === UserRole.MASTER) return true;
     if (currentUser.role === UserRole.ADMIN && targetUser.role === UserRole.PARTICIPANT) return true;
     if (currentUser.id === targetUser.id) return true;
     return false;
  };
  
  const showPasswordField = currentUser.role === UserRole.MASTER || (editingUser && currentUser.id === editingUser.id);
  const canChangeRole = currentUser.role === UserRole.MASTER;

  return (
    <div>
      <SectionHeader 
        title={currentUser.role === UserRole.PARTICIPANT ? "Meu Perfil" : "Gestão de Membros"} 
        subtitle={currentUser.role === UserRole.PARTICIPANT ? "Gerencie seus dados e preferências" : "Administração completa da Confraria"} 
      />
      
      {currentUser.role !== UserRole.PARTICIPANT && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-red-900">
             <h3 className="text-white font-bold mb-2">Ações Rápidas</h3>
             <div className="space-y-2">
               <Button variant="secondary" className="w-full text-left text-xs">Auditar Logs de Acesso</Button>
               <Button variant="secondary" className="w-full text-left text-xs">Alterar Termo Jurídico</Button>
             </div>
          </Card>
          <Card>
             <h3 className="text-white font-bold mb-2">Status do Sistema</h3>
             <div className="space-y-2">
               <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                 <span className="text-zinc-400 text-sm">Novos cadastros</span>
                 <span className="text-green-500 text-xs uppercase font-bold">Habilitado</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                 <span className="text-zinc-400 text-sm">Total de Membros</span>
                 <span className="text-gold-500 text-xs uppercase font-bold">{users.length}</span>
               </div>
             </div>
          </Card>
        </div>
      )}

      {currentUser.role !== UserRole.PARTICIPANT && (
         <h3 className="text-gold-500 font-serif text-lg tracking-widest mb-4">Base de Usuários</h3>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900 text-zinc-200 uppercase font-bold text-xs">
            <tr>
              <th className="p-3 rounded-tl-lg">Membro</th>
              <th className="p-3">Nível</th>
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
                <td className="p-3"><Badge color={u.role === 'MASTER' ? 'bg-gold-600 text-black' : 'bg-zinc-800'}>{u.role}</Badge></td>
                <td className="p-3">
                  <span className={`w-2 h-2 inline-block rounded-full mr-2 ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {u.status}
                </td>
                <td className="p-3 flex items-center gap-2">
                  {canEdit(u) && (
                    <button onClick={() => handleEdit(u)} className="text-gold-600 hover:text-gold-400 p-1 flex items-center gap-1" title="Editar">
                        <Icons.Edit /> <span className="hidden md:inline text-xs">Editar</span>
                    </button>
                  )}
                  {canDelete(u) && (
                     <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-400 p-1 flex items-center gap-1" title={currentUser.id === u.id ? "Sair da Confraria" : "Excluir Usuário"}>
                         <Icons.Trash /> <span className="hidden md:inline text-xs">{currentUser.id === u.id ? 'Sair' : 'Excluir'}</span>
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={currentUser.id === editingUser?.id ? "Editar Meu Perfil" : "Editar Membro"}>
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
                <p className="text-[10px] text-zinc-500">Clique na imagem para alterar</p>
            </div>

             <div className="space-y-4">
                <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest border-b border-zinc-800 pb-1">Dados Pessoais</h4>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nome Completo</label>
                        <Input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">E-mail</label>
                        <Input value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Telefone / WhatsApp</label>
                        <Input value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} placeholder="(00) 00000-0000" />
                    </div>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest border-b border-zinc-800 pb-1">Empresas & Negócios</h4>
                
                <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block">Empresas</label>
                    {editingUser.companies.map((comp, idx) => (
                        <div key={idx} className="flex gap-2">
                            <Input 
                                placeholder={`Empresa ${idx + 1}`} 
                                value={comp} 
                                onChange={e => handleCompanyChange(idx, e.target.value)} 
                            />
                            {editingUser.companies.length > 1 && (
                                <button onClick={() => handleRemoveCompany(idx)} className="text-red-500 hover:text-red-400 px-2">
                                    <Icons.Trash />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddCompany} className="text-xs text-gold-500 hover:underline flex items-center gap-1">
                        <Icons.Plus className="w-3 h-3" /> Adicionar outra empresa
                    </button>
                </div>

                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Faixa de Faturamento Mensal</label>
                    <Input value={editingUser.revenue} onChange={e => setEditingUser({...editingUser, revenue: e.target.value})} placeholder="Ex: 50k - 100k / Mês" />
                </div>

                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Mini Currículo / Bio</label>
                    <TextArea 
                        rows={3} 
                        value={editingUser.bio} 
                        onChange={e => setEditingUser({...editingUser, bio: e.target.value})} 
                        placeholder="Breve descrição sobre sua trajetória..."
                    />
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest border-b border-zinc-800 pb-1">Acesso & Segurança</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Nível de Acesso</label>
                       <select 
                          className={`w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-zinc-200 ${!canChangeRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                          value={editingUser.role}
                          onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                          disabled={!canChangeRole}
                       >
                         <option value="MASTER">MASTER</option>
                         <option value="ADMIN">ADMIN</option>
                         <option value="PARTICIPANT">PARTICIPANT</option>
                       </select>
                       {!canChangeRole && <p className="text-[9px] text-zinc-600 mt-1">Apenas Master pode alterar níveis.</p>}
                    </div>

                    {showPasswordField && (
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Definir Nova Senha</label>
                            <PasswordInput 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                placeholder="Mantenha em branco para não alterar"
                            />
                            <p className="text-[9px] text-zinc-600 mt-1 italic">
                              * Por segurança, senhas são criptografadas e não podem ser visualizadas.
                            </p>
                            {currentUser.id !== editingUser.id && (
                                <div className="mt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleSendPasswordReset}
                                        className="text-[10px] text-gold-500 underline hover:text-gold-400 font-bold"
                                    >
                                        Recomendar troca: Enviar Link de Redefinição via E-mail
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
