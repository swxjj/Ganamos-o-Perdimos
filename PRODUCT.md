# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing implementation: HTML/CSS/JavaScript frontend (native SVG charts and canvas PNG export) + Python backend (Vercel serverless API + pandas data processing).

## Users

Argentine workers and researchers who need to understand whether and how their salary has kept pace with inflation, accounting for their consumption patterns and employment sector. The niche: users whose inflation experience differs by social class—i.e., how they spend money matters as much as how much they earn.

## Product Purpose

Reveal the real purchasing power of salaries across employment types (private, government, informal) and social classes by comparing salary growth to inflation *as experienced by that class*. Workers can see not just "did inflation outpace my wage," but "how did *my* spending patterns affect my real income?"

Success means users can confidently answer: "Did I win or lose against inflation, given how I spend?"

## Positioning

Class-aware inflation analysis. While aggregate inflation data exists everywhere, this tool is the first to let Argentine workers measure real purchasing power through the lens of their actual spending basket—defined by social class, with plans for custom baskets. The uniqueness is coupling employment type data (private, public, informal) with class-based consumption patterns to reveal inequality that aggregate statistics hide.

## Operating Context

Users access the tool to perform ad-hoc financial analysis:
- Select a date range (historical data from INDEC: 2016-present)
- Choose employment type (registered private-sector work, government jobs, informal work)
- View inflation impact on their spending category distribution
- Confirm whether their sector's salary index beat the cost of living

Data source: Official Argentine economic statistics (INDEC APIs: CPI, salaries by sector, cost-of-living basket).

## Capabilities and Constraints

**Current capabilities:**
- Filter by employment sector (Privado, Público, Informal)
- View date ranges (backend supports 2016–present)
- Inspect inflation by spending category (food, housing, transport, education, etc.)
- Compare salary index to inflation in real time

**Constraints & Planned:**
- Single-class selection per view (future: custom spending baskets)
- Data limited to INDEC source and structure
- Spanish language (Spanish-speaking, Argentina-focused audience)
- Live, minimal current traffic (growth is not the immediate goal)

## Brand Commitments

None established yet. The product is live but without committed voice, tagline, or public positioning statement. The Spanish title "¿Ganamos o Perdimos?" (Did we win or lose?) captures the core question but no formal brand guidelines exist.

## Evidence on Hand

Working implementation: 
- [public/index.html](public/index.html) — semantic interface with a light editorial design, responsive layout, SVG charts and accessible data tables
- [api/index.py](api/index.py) — serverless backend fetching and processing INDEC data  
- [app_inflacion.py](app_inflacion.py) — Streamlit prototype (reference)

Real data: Official INDEC time series, historical since 2016.

## Product Principles

1. **Transparency through specificity.** Aggregate inflation hides class-based truth; drilling down by spending pattern reveals real purchasing power.
2. **Agency over passivity.** Users *choose* their employment type, date range, and spending patterns—the tool surfaces what *their* inflation looks like, not generic numbers.
3. **Clarity first.** Data drives the design; easy understanding and clear visualization are non-negotiable.
4. **Evidence-based only.** No speculation, projections, or invented data; trust only official INDEC sources.

## Accessibility & Inclusion

Not yet formally defined. Spanish language implies Argentina/Spanish-speaking audience; no specific accessibility standard or inclusion requirement documented yet.
