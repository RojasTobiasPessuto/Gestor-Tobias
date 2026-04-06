import { useState } from 'react';
import toast from 'react-hot-toast';
import TransactionForm from '../components/TransactionForm';
import { createTransaction } from '../api';

export default function Gastos() {
  const [key, setKey] = useState(0);

  const handleSubmit = async (data: {
    amount: number;
    account_id: number;
    category: string;
    comment: string;
    date: string;
  }) => {
    await createTransaction({
      type: 'GASTO',
      amount: data.amount,
      account_id: data.account_id,
      category: data.category,
      comment: data.comment,
      date: data.date,
    });
    toast.success('Gasto registrado');
    setKey((k) => k + 1);
  };

  return (
    <div className="page">
      <h2>Nuevo Gasto</h2>
      <TransactionForm key={key} onSubmit={handleSubmit} submitLabel="Registrar Gasto" />
    </div>
  );
}
