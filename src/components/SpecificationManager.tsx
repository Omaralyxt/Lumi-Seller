import React, { useCallback } from 'react';
import { Specification } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';

interface SpecificationManagerProps {
  specifications: Specification[];
  setSpecifications: (specs: Specification[]) => void;
  isSubmitting: boolean;
}

const SpecificationManager: React.FC<SpecificationManagerProps> = ({ specifications, setSpecifications, isSubmitting }) => {
  
  const addSpecification = useCallback(() => {
    setSpecifications([
      ...specifications,
      { id: uuidv4(), name: '', value: '' },
    ]);
  }, [specifications, setSpecifications]);

  const updateSpecification = useCallback((id: string, field: 'name' | 'value', value: string) => {
    setSpecifications(
      specifications.map(spec => 
        spec.id === id ? { ...spec, [field]: value } : spec
      )
    );
  }, [specifications, setSpecifications]);

  const removeSpecification = useCallback((id: string) => {
    setSpecifications(specifications.filter(spec => spec.id !== id));
  }, [specifications, setSpecifications]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-bold flex items-center">
        <List className="h-5 w-5 mr-2" /> Especificações Técnicas (Opcional)
      </h3>
      <p className="text-sm text-muted-foreground">Adicione pares de chave/valor para criar uma tabela de especificações (ex: "Peso" / "200g", "RAM" / "8 GB").</p>
      
      <div className="space-y-3">
        {specifications.map((spec, index) => (
          <div key={spec.id} className="flex items-end space-x-3 p-3 border border-border rounded-lg bg-background">
            <div className="flex-1 grid gap-1">
              <Label htmlFor={`spec-name-${spec.id}`} className="text-xs text-muted-foreground">Nome</Label>
              <Input
                id={`spec-name-${spec.id}`}
                placeholder="Ex: Memória RAM"
                value={spec.name}
                onChange={(e) => updateSpecification(spec.id, 'name', e.target.value)}
                disabled={isSubmitting}
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 grid gap-1">
              <Label htmlFor={`spec-value-${spec.id}`} className="text-xs text-muted-foreground">Valor</Label>
              <Input
                id={`spec-value-${spec.id}`}
                placeholder="Ex: 8 GB"
                value={spec.value}
                onChange={(e) => updateSpecification(spec.id, 'value', e.target.value)}
                disabled={isSubmitting}
                className="rounded-lg"
              />
            </div>
            <Button 
              type="button" 
              variant="destructive" 
              size="icon" 
              onClick={() => removeSpecification(spec.id)}
              disabled={isSubmitting}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addSpecification} className="w-full font-heading rounded-xl border-dashed">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Especificação
      </Button>
      <Separator />
    </div>
  );
};

export default SpecificationManager;