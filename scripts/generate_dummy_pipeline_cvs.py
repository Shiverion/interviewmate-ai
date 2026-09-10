"""Generate synthetic CV PDFs for the bulk pipeline smoke test.

Requires the local reportlab package. The files contain fictional names and
example.com addresses only; they are safe to use as test data.
"""

from pathlib import Path
from textwrap import wrap

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


OUT = Path(__file__).resolve().parents[1] / "docs" / "hr-product-sprint" / "evaluation" / "dataset" / "cv-pipeline-v1"

TARGET_ROLE = "Senior Frontend Engineer - InterviewMate AI"

CVS = [
    {
        "name": "Aisha Rahman",
        "email": "aisha.rahman@example.com",
        "location": "Jakarta, Indonesia",
        "title": "Senior Frontend Engineer",
        "summary": "Frontend engineer with 8 years building reliable, accessible web products. I specialize in React, TypeScript and Next.js, with a strong record of turning ambiguous product requirements into tested interfaces. I have led delivery across design, backend and QA while keeping performance, security and user outcomes visible.",
        "experience": [
            "Lead Frontend Engineer, Northstar Labs (2021-2025): built a Next.js and TypeScript candidate workspace used by 40,000 monthly users; reduced first-load time by 38%.",
            "Frontend Engineer, Orbit Systems (2017-2021): shipped React and Node.js features backed by REST APIs, Firebase authentication and role-based access.",
            "Introduced Jest, Cypress and CI/CD quality gates; partnered with accessibility specialists to meet WCAG 2.2 AA and documented tradeoffs in code reviews.",
        ],
        "skills": "React, TypeScript, Next.js, Node.js, REST APIs, Firebase, Jest, Cypress, Git, GitHub, accessibility, WCAG, performance, CI/CD, Docker, AWS, GraphQL, testing, code review",
        "education": "BSc Computer Science, University of Indonesia, 2017",
    },
    {
        "name": "Bima Santoso",
        "email": "bima.santoso@example.com",
        "location": "Bandung, Indonesia",
        "title": "Staff Frontend Engineer",
        "summary": "Staff-level software engineer with 9 years of experience leading frontend architecture and mentoring teams. Deep experience with React, TypeScript, Next.js, Node.js and cloud delivery. I make system design decisions explicit, validate outcomes with tests and metrics, and collaborate closely with product and design.",
        "experience": [
            "Staff Engineer, Atlas Commerce (2020-2025): designed a modular Next.js platform, introduced shared TypeScript contracts and improved deployment frequency from weekly to daily.",
            "Senior Engineer, Karya Digital (2016-2020): delivered React dashboards, REST API integrations and Firebase services for multi-tenant customers.",
            "Owned frontend testing strategy with Jest and Cypress, accessibility reviews, GitHub workflows, Docker builds and incident retrospectives.",
        ],
        "skills": "React, TypeScript, Next.js, Node.js, REST APIs, Firebase, Jest, Cypress, Git, GitHub, accessibility, performance, CI/CD, Docker, AWS, system design, technical leadership, testing, code review",
        "education": "BEng Software Engineering, Institut Teknologi Bandung, 2016",
    },
    {
        "name": "Clara Nguyen",
        "email": "clara.nguyen@example.com",
        "location": "Singapore",
        "title": "Senior Product Engineer",
        "summary": "Product-minded engineer with 6 years of experience building React applications and customer-facing workflows. I enjoy balancing a clear user experience with maintainable TypeScript, measurable performance and dependable validation. Comfortable owning a feature from discovery through release.",
        "experience": [
            "Senior Product Engineer, Lumen Health (2021-2025): built accessible React and Next.js patient workflows, integrated Node.js REST APIs and improved completion rate by 22%.",
            "Software Engineer, Brightworks (2019-2021): implemented TypeScript components, Firebase data access and GitHub CI/CD pipelines.",
            "Added Jest and Cypress coverage, led code reviews and partnered with design on keyboard navigation and responsive behavior.",
        ],
        "skills": "React, TypeScript, Next.js, Node.js, REST APIs, Firebase, Jest, Cypress, Git, GitHub, accessibility, performance, CI/CD, testing, product thinking, code review",
        "education": "BSc Information Systems, National University of Singapore, 2019",
    },
    {
        "name": "Dimas Pratama",
        "email": "dimas.pratama@example.com",
        "location": "Surabaya, Indonesia",
        "title": "Frontend Engineer",
        "summary": "Frontend engineer with 4 years of experience delivering responsive web interfaces. Strong in React, JavaScript and CSS, with growing TypeScript experience. I work well with designers and can own a feature through implementation and manual validation.",
        "experience": [
            "Frontend Engineer, Nusantara Retail (2022-2025): delivered React checkout and account pages, integrated REST APIs and maintained Git workflows.",
            "Junior Web Developer, Pixel House (2021-2022): built responsive HTML, CSS and JavaScript pages and fixed browser compatibility issues.",
            "Contributed basic Jest tests and participated in code review; partnered with QA on regression checks and release notes.",
        ],
        "skills": "React, JavaScript, TypeScript, HTML, CSS, REST APIs, Git, Jest, responsive design, testing, code review, Figma",
        "education": "Diploma in Web Development, Politeknik Negeri Surabaya, 2021",
    },
    {
        "name": "Emily Carter",
        "email": "emily.carter@example.com",
        "location": "Austin, United States",
        "title": "Full Stack Developer",
        "summary": "Full stack developer with 5 years of experience across Vue, React and Node.js. I have delivered internal tools and REST API integrations and enjoy debugging production issues. My recent work is moving toward TypeScript and Next.js, supported by a practical testing habit.",
        "experience": [
            "Full Stack Developer, Cedar Analytics (2020-2025): built Vue and React dashboards, Node.js REST APIs and PostgreSQL data views for operations teams.",
            "Web Developer, MarketLoop (2018-2020): maintained JavaScript applications, added Jest tests and coordinated releases through GitHub Actions.",
            "Led a migration spike from Vue to Next.js and documented performance findings; limited experience with Firebase and accessibility audits.",
        ],
        "skills": "React, Vue, JavaScript, TypeScript, Node.js, REST APIs, PostgreSQL, Jest, Git, GitHub Actions, Next.js, debugging, testing",
        "education": "BS Computer Science, Texas State University, 2018",
    },
    {
        "name": "Farhan Yusuf",
        "email": "farhan.yusuf@example.com",
        "location": "Yogyakarta, Indonesia",
        "title": "Software Engineer",
        "summary": "Software engineer with 3 years of experience focused on Python services and data workflows. I have supported a small React admin tool and understand REST API integration, but most of my production work is backend and automation rather than frontend product delivery.",
        "experience": [
            "Software Engineer, DataKita (2022-2025): maintained Python services, Django endpoints and scheduled data pipelines; wrote integration tests and GitHub Actions workflows.",
            "Engineering Intern, Peta Labs (2021-2022): fixed React form issues, documented APIs and helped QA reproduce defects.",
            "Interested in expanding React and TypeScript experience; no professional Next.js or Firebase ownership yet.",
        ],
        "skills": "Python, Django, REST APIs, React, JavaScript, SQL, Git, GitHub Actions, Linux, pytest, integration testing, debugging",
        "education": "BSc Mathematics, Universitas Gadjah Mada, 2021",
    },
    {
        "name": "Grace Lim",
        "email": "grace.lim@example.com",
        "location": "Kuala Lumpur, Malaysia",
        "title": "UX Engineer",
        "summary": "UX engineer with 5 years of experience translating design systems into accessible interfaces. I am strongest in HTML, CSS, React and user research collaboration. I have less experience with backend services and release automation, but I care deeply about keyboard support, clarity and inclusive outcomes.",
        "experience": [
            "UX Engineer, Common Ground (2021-2025): built React component libraries, documented accessibility decisions and partnered with designers on responsive prototypes.",
            "UI Developer, Paperplane Studio (2020-2021): delivered HTML, CSS and JavaScript marketing and account pages.",
            "Ran manual usability checks and contributed small Jest tests; no direct Node.js, Firebase or Next.js ownership in production.",
        ],
        "skills": "React, JavaScript, HTML, CSS, accessibility, WCAG, design systems, Figma, usability testing, Git, Jest, responsive design",
        "education": "BA Interaction Design, Taylor's University, 2020",
    },
    {
        "name": "Hendra Wijaya",
        "email": "hendra.wijaya@example.com",
        "location": "Jakarta, Indonesia",
        "title": "Data Analyst",
        "summary": "Data analyst with 6 years of experience turning operational data into dashboards and recommendations. Strong in SQL, Python and visualization. I have not built production React applications or owned frontend testing and accessibility work.",
        "experience": [
            "Senior Data Analyst, Prima Logistics (2020-2025): built SQL models, Python analysis and Tableau dashboards that improved route planning decisions.",
            "Data Analyst, SatuMart (2018-2020): automated spreadsheet reporting and presented weekly metrics to commercial teams.",
            "Collaborated with engineering on data definitions but did not own web application delivery or CI/CD.",
        ],
        "skills": "SQL, Python, pandas, Tableau, Power BI, Excel, statistics, data visualization, stakeholder communication, Git basics",
        "education": "BSc Statistics, Universitas Padjadjaran, 2018",
    },
    {
        "name": "Intan Maharani",
        "email": "intan.maharani@example.com",
        "location": "Denpasar, Indonesia",
        "title": "Marketing Manager",
        "summary": "Marketing manager with 7 years of experience planning campaigns, content calendars and partner programs. I use analytics to track reach and conversion and collaborate with creative teams. My background does not include software engineering or web application development.",
        "experience": [
            "Marketing Manager, Seaside Travel (2019-2025): led brand campaigns, managed agencies and improved qualified leads through structured experimentation.",
            "Marketing Specialist, Kompas Creative (2017-2019): planned social campaigns, newsletters and event partnerships.",
            "Comfortable with Google Analytics, HubSpot and presentations; no React, TypeScript, Node.js or software testing experience.",
        ],
        "skills": "Campaign strategy, content marketing, SEO, Google Analytics, HubSpot, email marketing, budgeting, stakeholder communication, presentations",
        "education": "BA Communications, Universitas Airlangga, 2017",
    },
    {
        "name": "Joko Setiawan",
        "email": "joko.setiawan@example.com",
        "location": "Semarang, Indonesia",
        "title": "Mechanical Engineer",
        "summary": "Mechanical engineer with 8 years of experience designing manufacturing fixtures and improving production processes. Skilled in CAD, MATLAB and lean methods. I am changing careers toward software but do not yet have professional frontend, React or web application experience.",
        "experience": [
            "Mechanical Engineer, Aruna Manufacturing (2017-2025): designed tooling in SolidWorks, ran tolerance studies and reduced material waste through process improvements.",
            "Engineering Associate, Bumi Components (2016-2017): maintained drawings, supplier documentation and factory quality checks.",
            "Completed introductory programming courses; no production JavaScript, TypeScript, React, Node.js or testing experience.",
        ],
        "skills": "SolidWorks, AutoCAD, MATLAB, mechanical design, GD&T, lean manufacturing, process improvement, quality control, Excel, project coordination",
        "education": "BEng Mechanical Engineering, Universitas Diponegoro, 2016",
    },
]


def draw_wrapped(c, text, x, y, width=94, leading=13, font="Helvetica", size=9):
    c.setFont(font, size)
    for line in wrap(text, width):
        if y < 55:
            c.showPage()
            y = 760
            c.setFont(font, size)
        c.drawString(x, y, line)
        y -= leading
    return y


def write_cv(index, cv):
    path = OUT / f"{index:02d}-{cv['name'].lower().replace(' ', '-')}.pdf"
    c = canvas.Canvas(str(path), pagesize=letter)
    c.setTitle(f"Synthetic CV - {cv['name']}")
    y = 750
    c.setFillColorRGB(0.18, 0.24, 0.30)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(54, y, cv["name"])
    y -= 20
    c.setFillColorRGB(0.25, 0.25, 0.25)
    c.setFont("Helvetica", 9)
    c.drawString(54, y, f"{cv['email']}  |  {cv['location']}")
    y -= 13
    c.drawString(54, y, "SYNTHETIC TEST CV - FICTIONAL DATA - DO NOT CONTACT")
    y -= 26

    def section(title, body, bullet=False):
        nonlocal y
        if y < 100:
            c.showPage()
            y = 760
        c.setFillColorRGB(0.08, 0.42, 0.36)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(54, y, title.upper())
        y -= 16
        c.setFillColorRGB(0.15, 0.15, 0.15)
        if isinstance(body, list):
            for item in body:
                y = draw_wrapped(c, ("- " if bullet else "") + item, 64, y, 86)
                y -= 4
        else:
            y = draw_wrapped(c, body, 54, y, 94)
        y -= 10

    section("Target title", cv["title"])
    section("Professional summary", cv["summary"])
    section("Experience", cv["experience"], bullet=True)
    section("Skills", cv["skills"])
    section("Education", cv["education"])
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(54, 38, f"Synthetic pipeline fixture {index:02d} | Target role: {TARGET_ROLE}")
    c.save()
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for index, cv in enumerate(CVS, start=1):
        write_cv(index, cv)
    print(f"Generated {len(CVS)} synthetic CVs in {OUT}")


if __name__ == "__main__":
    main()
