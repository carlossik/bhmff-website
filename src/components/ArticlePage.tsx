import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { Article } from '../data/festivalData'

type ArticlePageProps = { article: Article; onBack: () => void }
export function ArticlePage({ article, onBack }: ArticlePageProps) {
  return (
    <main className="articlePage">
      <div className="container">
        <button className="backButton" type="button" onClick={onBack}><ArrowLeft size={18} /> Back to festival site</button>
        <article className="articleShell">
          <span className="badge">{article.category}</span>
          <h1>{article.title}</h1>
          <p className="articleHero">{article.hero}</p>
          <span className="readTime">{article.readTime}</span>
          <div className="articleBody">{article.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          {article.actions && <div className="articleActions">{article.actions.map((action) => <a key={action.href} className="btn secondary" href={action.href} target="_blank" rel="noreferrer">{action.label} <ExternalLink size={16} /></a>)}</div>}
        </article>
      </div>
    </main>
  )
}
