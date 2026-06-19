SHOW DATABASES;
DROP DATABASE databasename;
CREATE DATABASE interview_practice
SHOW TABLES FROM interview_practice;
USE interview_practice;
CREATE TABLE interview_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic VARCHAR(255),
    job_role VARCHAR(255), 
    difficulty VARCHAR(50), 
    question TEXT,
    answer TEXT,
    answer_comment TEXT,
    date_of_entry DATETIME DEFAULT (CURRENT_TIMESTAMP())
);
ALTER TABLE interview_questions MODIFY COLUMN bill_address VARCHAR(255);
ALTER TABLE interview_questions ADD bill_id INT PRIMARY KEY AUTO_INCREMENT;
ALTER TABLE interview_questions MODIFY COLUMN date_of_entry DATETIME DEFAULT (CURRENT_TIMESTAMP()) AFTER bill_data;
ALTER TABLE interview_questions ADD bill_advance INT;
ALTER TABLE interview_questions ADD bill_balance INT;
ALTER TABLE interview_questions ADD bill_km INT;

desc interview_questions
SELECT * from interview_questions;
SELECT * FROM interview_questions ORDER BY date_of_entry DESC;

DROP TABLE interview_questions;
DELETE FROM interview_questions WHERE bill_id = 8;

INSERT INTO interview_questions
(
    topic,
    job_role,
    difficulty,
    question,
    answer,
    answer_comment
)
VALUES
(
    'LangChain',
    'AI Engineer',
    'Easy',
    'What is LangChain?',
    'LangChain is an open-source framework used to build LLM-powered applications.',
    'Candidate should explain LangChain framework, components, chains, agents, tools, and integrations.'
);
SELECT COUNT(*) FROM bill_details
