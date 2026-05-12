import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowLeft, ArrowRight, Trophy, AlertTriangle } from 'lucide-react';
import MilestoneDialog from '@/components/MilestoneDialog';
import { checkMilestone } from '@/lib/achievements';

interface Question {
  id: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
}

interface Props {
  questions: Question[];
  levelId: string;
  passingScore: number;
  basePath: string;
  onPassedWithDiploma?: (score: number) => void;
}

export default function LevelTest({ questions, levelId, passingScore, basePath, onPassedWithDiploma }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const question = questions[currentIndex];
  const options = question ? [question.option_1, question.option_2, question.option_3, question.option_4].filter(Boolean) : [];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelect = (optNum: number) => {
    setAnswers(a => ({ ...a, [currentIndex]: optNum }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Build answers array for server-side validation
      const questionAnswers = questions.map((q, i) => ({
        question_id: q.id,
        answer: answers[i] || 0,
      }));

      const { data } = await supabase.rpc('submit_quiz_test', {
        p_question_answers: questionAnswers,
      });

      const results = data as unknown as Array<{ question_id: string; correct: boolean }>;
      const correctCount = results.filter(r => r.correct).length;
      const score = Math.round((correctCount / questions.length) * 100);
      const passed = score >= passingScore;

      setTestScore(score);
      setTestPassed(passed);

      // Add failed questions to review
      if (user) {
        for (const result of results) {
          if (!result.correct) {
            await supabase.from('review_items').upsert({
              user_id: user.id,
              question_id: result.question_id,
              confidence: 'unknown',
              source: 'failed_quiz',
            }, { onConflict: 'user_id,question_id' });
          }
        }

        await supabase.rpc('complete_level', { p_level_id: levelId, p_question_answers: questionAnswers });
        await refreshProfile();
      }

      setFinished(true);

      if (passed && onPassedWithDiploma) {
        setTimeout(() => onPassedWithDiploma(score), 1500);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!started) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold">Závěrečný test</h3>
          <p className="text-muted-foreground">
            Pro postup do dalšího levelu potřebujete minimálně {passingScore}% správných odpovědí.
          </p>
          <p className="text-sm text-muted-foreground">Počet otázek: {questions.length}</p>
          <Button onClick={() => setStarted(true)} className="gradient-primary text-primary-foreground" disabled={questions.length === 0}>
            Začít test <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (finished && testScore !== null) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${testPassed ? 'bg-success/20' : 'bg-destructive/20'}`}>
            {testPassed ? <Trophy className="h-8 w-8 text-success" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
          </div>
          <h3 className="text-xl font-bold">{testPassed ? 'Gratulujeme! 🎉' : 'Bohužel neprojdete'}</h3>
          <p className="text-2xl font-bold">{testScore}%</p>
          <p className="text-muted-foreground">
            {testPassed ? 'Úspěšně jste dokončili tento level! Za chvíli uvidíte svůj diplom...' : `Potřebujete alespoň ${passingScore}%. Zkuste to znovu.`}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(`${basePath}/levels`)}>
              Zpět na levely
            </Button>
            {!testPassed && (
              <Button onClick={() => { setStarted(false); setFinished(false); setAnswers({}); setCurrentIndex(0); setTestScore(null); }} className="gradient-primary text-primary-foreground">
                Zkusit znovu
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">{question.question_text}</h3>
          <div className="space-y-3">
            {options.map((opt, i) => {
              const optNum = i + 1;
              const isSelected = answers[currentIndex] === optNum;
              return (
                <button
                  key={i}
                  className={`border-2 p-4 rounded-xl cursor-pointer transition-all text-left w-full ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => handleSelect(optNum)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
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
        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext} disabled={!answers[currentIndex]} className="gradient-primary text-primary-foreground">
              Další <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length || submitting} className="gradient-primary text-primary-foreground">
              {submitting ? 'Odesílání...' : 'Odevzdat test'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
