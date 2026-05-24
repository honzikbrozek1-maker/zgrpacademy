import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, HelpCircle, XCircle, RotateCcw, ArrowRight, ArrowLeft, PenLine } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ReviewItem {
  id: string;
  question_id: string;
  confidence: string;
  source: string;
  question?: {
    question_text: string;
    back_text: string | null;
    option_1: string | null;
    option_2: string | null;
    option_3: string | null;
    option_4: string | null;
    type: string;
  };
}

export default function Review() {
  const { user } = useAuth();
  const { category } = useAppPath();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'menu' | 'flashcard' | 'quiz' | 'fillin'>('menu');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    // Get levels for this category
    const { data: levelsData } = await supabase.from('levels').select('id').eq('category', category);
    if (!levelsData || levelsData.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const levelIds = levelsData.map(l => l.id);
    // Get questions for these levels
    const { data: questionIds } = await supabase.from('questions_safe' as any).select('id, question_text, back_text, option_1, option_2, option_3, option_4, type').in('level_id', levelIds).eq('in_practice', true);
    if (!questionIds || questionIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const questionsMap = new Map((questionIds as any[]).map((q: any) => [q.id, q]));
    const qIds = [...questionsMap.keys()];
    
    const { data } = await supabase
      .from('review_items')
      .select('*')
      .eq('user_id', user.id)
      .in('question_id', qIds)
      .in('confidence', ['partial', 'unknown'])
      .order('updated_at', { ascending: false });
    
    if (data) {
      setItems(data.map(item => ({
        ...item,
        question: questionsMap.get(item.question_id),
      })));
    }
    setLoading(false);
  }, [user, category]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateConfidence = async (id: string, confidence: string) => {
    if (confidence === 'know') {
      // Delete from DB so it never comes back
      await supabase.from('review_items').delete().eq('id', id);
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      await supabase.from('review_items').update({ confidence }).eq('id', id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, confidence } : i));
    }
  };

  const advanceReviewItem = async (confidence: 'know' | 'partial' | 'unknown') => {
    if (!currentItem) return;

    const totalItems = activeItems.length;
    const itemId = currentItem.id;

    await updateConfidence(itemId, confidence);
    setFlipped(false);
    setSelected(null);
    setShowResult(false);
    setCorrectAnswer(null);
    setChecking(false);

    if (confidence === 'know') {
      if (totalItems === 1) {
        setMode('menu');
        setCurrentIndex(0);
        fetchItems();
        return;
      }

      if (currentIndex >= totalItems - 1) {
        setCurrentIndex(totalItems - 2);
      }

      return;
    }

    if (currentIndex < totalItems - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setMode('menu');
      setCurrentIndex(0);
      fetchItems();
    }
  };

  const flashcardItems = items.filter(i => i.question?.type === 'flashcard' || i.source === 'flashcard');
  const quizItems = items.filter(i => i.question?.type === 'quiz' || i.source === 'failed_quiz');
  const fillBlankItems = items.filter(i => i.question?.type === 'fill_blank' || i.source === 'fill_blank');

  // FIX: fillin mode uses fillBlankItems, not all items
  const activeItems = mode === 'flashcard' ? flashcardItems : mode === 'quiz' ? quizItems : mode === 'fillin' ? fillBlankItems : items;
  const currentItem = activeItems[currentIndex];
  const progressVal = activeItems.length > 0 ? ((currentIndex + 1) / activeItems.length) * 100 : 0;


  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setFlipped(false);
      setSelected(null);
      setShowResult(false);
    }
  };

  const goBack = () => {
    if (mode !== 'menu') {
      setMode('menu');
      setCurrentIndex(0);
      fetchItems();
    } else {
      navigate(-1);
    }
  };

  if (loading) return (
    <AppLayout><div className="p-8 text-center text-muted-foreground">Načítání...</div></AppLayout>
  );

  // Study mode - flashcard style
  if (mode === 'flashcard' && currentItem) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 animate-slide-up pb-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Procvičování kartiček</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{currentIndex + 1}/{activeItems.length}</span>
            <Progress value={progressVal} className="h-2 flex-1" />
          </div>
          <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <div className={`relative w-full min-h-[250px] preserve-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}>
              <Card className="absolute inset-0 backface-hidden shadow-elevated">
                <CardContent className="p-8 flex flex-col items-center justify-center min-h-[250px]">
                  <p className="text-xs text-muted-foreground mb-4">Kliknutím otočíte</p>
                  <h3 className="text-xl font-semibold text-center">{currentItem.question?.question_text}</h3>
                </CardContent>
              </Card>
              <Card className="absolute inset-0 backface-hidden rotate-y-180 shadow-elevated">
                <CardContent className="p-8 flex flex-col items-center justify-center min-h-[250px]">
                  <p className="text-xs text-muted-foreground mb-4">Odpověď</p>
                  <p className="text-lg text-center">{currentItem.question?.back_text || 'Bez odpovědi'}</p>
                </CardContent>
              </Card>
            </div>
          </div>
          {flipped && (
            <div className="flex justify-center gap-3 animate-slide-up">
              <Button variant="outline" className="border-success text-success hover:bg-success/10" onClick={() => advanceReviewItem('know')}>
                <CheckCircle className="mr-1 h-4 w-4" /> Umím
              </Button>
              <Button variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={() => advanceReviewItem('partial')}>
                <HelpCircle className="mr-1 h-4 w-4" /> Částečně
              </Button>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => advanceReviewItem('unknown')}>
                <XCircle className="mr-1 h-4 w-4" /> Neumím
              </Button>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
            </Button>
            <Button variant="ghost" onClick={() => setFlipped(!flipped)}>
              <RotateCcw className="mr-1 h-4 w-4" /> Otočit
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Study mode - quiz style
  if (mode === 'quiz' && currentItem) {
    const q = currentItem.question;
    const options = [q?.option_1, q?.option_2, q?.option_3, q?.option_4].filter(Boolean);

    const handleSelectQuiz = async (optIndex: number) => {
      if (showResult || checking) return;
      setSelected(optIndex);
      setChecking(true);
      try {
        const { data } = await supabase.rpc('check_quiz_answer', {
          p_question_id: currentItem.question_id,
          p_answer: optIndex,
        });
        const result = data as unknown as { correct: boolean; correct_answer?: number };
        setCorrectAnswer(result.correct ? optIndex : (result.correct_answer ?? null));
        setShowResult(true);
      } finally {
        setChecking(false);
      }
    };

    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 animate-slide-up pb-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Procvičování kvízu</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{currentIndex + 1}/{activeItems.length}</span>
            <Progress value={progressVal} className="h-2 flex-1" />
          </div>
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">{q?.question_text}</h3>
              <div className="space-y-3">
                {options.map((opt, i) => {
                  const optNum = i + 1;
                  let cls = 'border-2 p-4 rounded-xl cursor-pointer transition-all text-left w-full';
                  if (showResult) {
                    if (optNum === correctAnswer) cls += ' border-success bg-success/10';
                    else if (optNum === selected) cls += ' border-destructive bg-destructive/10';
                    else cls += ' border-border opacity-50';
                  } else {
                    cls += ' border-border hover:border-primary/50';
                  }
                  return (
                    <button key={i} className={cls} onClick={() => handleSelectQuiz(optNum)} disabled={showResult || checking}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {showResult && optNum === correctAnswer && <CheckCircle className="h-5 w-5 text-success" />}
                        {showResult && optNum === selected && optNum !== correctAnswer && <XCircle className="h-5 w-5 text-destructive" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
            </Button>
            {showResult && (
              <Button onClick={() => advanceReviewItem(selected === correctAnswer ? 'know' : 'unknown')} className="gradient-primary text-primary-foreground">
                {currentIndex < activeItems.length - 1 ? 'Další' : 'Dokončit'} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (mode === 'fillin' && currentItem) {
    const q = currentItem.question;
    const fillinOptions = [
      q?.option_1 ? { text: q.option_1, index: 1 } : null,
      q?.option_2 ? { text: q.option_2, index: 2 } : null,
      q?.option_3 ? { text: q.option_3, index: 3 } : null,
      q?.option_4 ? { text: q.option_4, index: 4 } : null,
    ].filter((option): option is { text: string; index: number } => Boolean(option));

    const backText = q?.back_text || '';
    const blankIndex = backText.indexOf('______');
    const blankSentence = blankIndex >= 0
      ? { before: backText.slice(0, blankIndex), after: backText.slice(blankIndex + 6) }
      : null;

    const fillinCorrectText = correctAnswer !== null
      ? [q?.option_1, q?.option_2, q?.option_3, q?.option_4][correctAnswer - 1] || ''
      : '';

    const fillinSentence = showResult && correctAnswer !== null && backText
      ? (() => {
          if (blankIndex >= 0) return { before: backText.slice(0, blankIndex), after: backText.slice(blankIndex + 6) };
          if (fillinCorrectText) {
            const idx = backText.toLowerCase().indexOf(fillinCorrectText.toLowerCase());
            if (idx >= 0) return { before: backText.slice(0, idx), after: backText.slice(idx + fillinCorrectText.length) };
          }
          return null;
        })()
      : blankSentence;

    const handleSelectFillin = async (optIndex: number) => {
      if (showResult || checking) return;
      setSelected(optIndex);
      setChecking(true);
      try {
        const { data } = await supabase.rpc('check_quiz_answer', {
          p_question_id: currentItem.question_id,
          p_answer: optIndex,
        });
        const result = data as unknown as { correct: boolean; correct_answer?: number };
        setCorrectAnswer(result.correct ? optIndex : (result.correct_answer ?? null));
        setShowResult(true);
      } finally {
        setChecking(false);
      }
    };

    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 animate-slide-up pb-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Procvičování doplňování</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{currentIndex + 1}/{activeItems.length}</span>
            <Progress value={progressVal} className="h-2 flex-1" />
          </div>
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-6">
              {fillinSentence ? (
                <div className="text-lg leading-relaxed">
                  <span>{fillinSentence.before}</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    showResult
                      ? selected === correctAnswer ? 'bg-success/20 text-success' : 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {showResult ? fillinCorrectText : '______'}
                  </span>
                  <span>{fillinSentence.after}</span>
                </div>
              ) : (
                <h3 className="text-lg font-semibold">{q?.question_text}</h3>
              )}

              <div className="grid grid-cols-2 gap-3">
                {fillinOptions.map((option) => {
                  const isSelected = selected === option.index;
                  const isAnswerCorrect = correctAnswer !== null && option.index === correctAnswer;
                  let className = 'border-2 rounded-xl p-3 text-center transition-all font-medium text-sm '; 

                  if (!showResult) {
                    className += 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer';
                  } else if (isAnswerCorrect) {
                    className += 'border-success bg-success/10 text-success';
                  } else if (isSelected) {
                    className += 'border-destructive bg-destructive/10 text-destructive';
                  } else {
                    className += 'border-border opacity-50';
                  }

                  return (
                    <button key={option.index} className={className} onClick={() => handleSelectFillin(option.index)} disabled={showResult || checking}>
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Předchozí
            </Button>
            {showResult && (
              <Button onClick={() => advanceReviewItem(selected === correctAnswer ? 'know' : 'unknown')} className="gradient-primary text-primary-foreground">
                {currentIndex < activeItems.length - 1 ? 'Další' : 'Dokončit'} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Menu view
  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Procvičování</h1>
        </div>

        {items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            🎉 Nemáte žádné položky k procvičení! Skvělá práce!
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flashcardItems.length > 0 && (
              <Card
                className="shadow-card cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => { setMode('flashcard'); setCurrentIndex(0); setFlipped(false); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <RotateCcw className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Kartičky</h3>
                    <p className="text-sm text-muted-foreground">{flashcardItems.length} k procvičení</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            )}
            {quizItems.length > 0 && (
              <Card
                className="shadow-card cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => { setMode('quiz'); setCurrentIndex(0); setSelected(null); setShowResult(false); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <HelpCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Kvíz</h3>
                    <p className="text-sm text-muted-foreground">{quizItems.length} k procvičení</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            )}
            {fillBlankItems.length > 0 && (
              <Card
                className="shadow-card cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => { setMode('fillin'); setCurrentIndex(0); setSelected(null); setShowResult(false); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <PenLine className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Doplňování</h3>
                    <p className="text-sm text-muted-foreground">{fillBlankItems.length} k procvičení</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
