import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Volume2, Download, CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import { AUDIO_CATALOG, AUDIO_BY_CATEGORY, AudioPhrase } from '@/data/audioCatalog';
import { generateAndSaveAudio, playPreGeneratedAudio, getPreGeneratedAudioUrl } from '@/services/preGeneratedAudioService';

export function AudioGenerator() {
  const [generating, setGenerating] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleGenerateAll = async () => {
    setGenerating(true);
    setProgress(0);
    setResults({});

    const phrases = selectedCategory 
      ? AUDIO_BY_CATEGORY[selectedCategory] || []
      : AUDIO_CATALOG;

    const newResults: Record<string, 'success' | 'error' | 'pending'> = {};
    
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      setCurrentPhrase(phrase.text);
      newResults[phrase.id] = 'pending';
      setResults({ ...newResults });

      try {
        const url = await generateAndSaveAudio(phrase.id, phrase.text, phrase.category);
        newResults[phrase.id] = url ? 'success' : 'error';
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Erro ao gerar áudio:', phrase.id, error);
        newResults[phrase.id] = 'error';
      }

      setProgress(((i + 1) / phrases.length) * 100);
      setResults({ ...newResults });
    }

    setGenerating(false);
    setCurrentPhrase(null);
    
    const successCount = Object.values(newResults).filter(r => r === 'success').length;
    const errorCount = Object.values(newResults).filter(r => r === 'error').length;
    
    toast.success(`Geração concluída: ${successCount} sucessos, ${errorCount} erros`);
  };

  const handleGenerateSingle = async (phrase: AudioPhrase) => {
    setResults(prev => ({ ...prev, [phrase.id]: 'pending' }));
    
    try {
      const url = await generateAndSaveAudio(phrase.id, phrase.text, phrase.category);
      setResults(prev => ({ ...prev, [phrase.id]: url ? 'success' : 'error' }));
      
      if (url) {
        toast.success(`Áudio gerado: ${phrase.id}`);
      } else {
        toast.error(`Erro ao gerar: ${phrase.id}`);
      }
    } catch (error) {
      setResults(prev => ({ ...prev, [phrase.id]: 'error' }));
      toast.error(`Erro ao gerar: ${phrase.id}`);
    }
  };

  const handlePlayAudio = async (phraseId: string) => {
    try {
      await playPreGeneratedAudio(phraseId);
    } catch (error) {
      toast.error('Erro ao reproduzir áudio');
    }
  };

  const categories = Object.keys(AUDIO_BY_CATEGORY);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Gerador de Áudios ElevenLabs
        </CardTitle>
        <CardDescription>
          Gera todos os áudios do sistema com voz feminina brasileira e salva no Supabase Storage.
          Total de {AUDIO_CATALOG.length} frases catalogadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtro por categoria */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Todas ({AUDIO_CATALOG.length})
          </Badge>
          {categories.map(cat => (
            <Badge 
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat} ({AUDIO_BY_CATEGORY[cat].length})
            </Badge>
          ))}
        </div>

        {/* Botão de gerar */}
        <div className="flex gap-4">
          <Button 
            onClick={handleGenerateAll}
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar {selectedCategory ? `Categoria: ${selectedCategory}` : 'Todos os Áudios'}
              </>
            )}
          </Button>
        </div>

        {/* Progresso */}
        {generating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {currentPhrase ? `Gerando: "${currentPhrase.substring(0, 50)}..."` : 'Processando...'}
            </p>
          </div>
        )}

        {/* Lista de frases */}
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-2">
            {(selectedCategory ? AUDIO_BY_CATEGORY[selectedCategory] : AUDIO_CATALOG).map(phrase => (
              <div 
                key={phrase.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {phrase.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {phrase.id}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{phrase.text}</p>
                </div>
                <div className="flex items-center gap-2">
                  {results[phrase.id] === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {results[phrase.id] === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {results[phrase.id] === 'pending' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePlayAudio(phrase.id)}
                    title="Reproduzir"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateSingle(phrase)}
                    disabled={generating || results[phrase.id] === 'pending'}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Resultados */}
        {Object.keys(results).length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-green-500">
              ✓ {Object.values(results).filter(r => r === 'success').length} gerados
            </span>
            <span className="text-red-500">
              ✗ {Object.values(results).filter(r => r === 'error').length} erros
            </span>
            <span className="text-blue-500">
              ⏳ {Object.values(results).filter(r => r === 'pending').length} pendentes
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
