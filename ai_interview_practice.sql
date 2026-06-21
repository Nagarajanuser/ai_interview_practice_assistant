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
ALTER TABLE interview_questions CHANGE COLUMN id q_id INT NOT NULL AUTO_INCREMENT;
SELECT * from interview_questions;
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
INSERT INTO interview_questions(topic,job_role,difficulty,question,answer,answer_comment) VALUES (
    'LangChain',
    'AI Engineer',
    'Easy',
    'What is LangChain?',
    'LangChain is an open-source framework used to build LLM-powered applications.',
    'Candidate should explain LangChain framework, components, chains, agents, tools, and integrations.'
);
SELECT COUNT(*) FROM interview_questions;
SELECT * from interview_questions;
TRUNCATE TABLE interview_questions;

LOAD DATA INFILE 'D:/AI_projects/AI_Interview_Practice_Assistant/interview_questions_sample.csv'
INTO TABLE interview_questions
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(topic, job_role, difficulty, question, answer);



CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    emailid VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    date_of_registration DATETIME DEFAULT (CURRENT_TIMESTAMP())
)
SELECT * from users;

CREATE TABLE interview_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    interview_name VARCHAR(255),
    start_time DATETIME,
    total_questions INT,
    status VARCHAR(50),
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP()),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
ALTER TABLE interview_sessions 
MODIFY COLUMN status ENUM('CREATED','NOT_STARTED','IN_PROGRESS','COMPLETED','ABANDONED') DEFAULT 'CREATED';
SELECT * from interview_sessions;
TRUNCATE TABLE interview_sessions;

CREATE TABLE candidate_answers (
	can_ans_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT,
    q_id INT,
    candidate_answer TEXT,
    score INT,
    user_id INT,
    llm_comment TEXT
);
SELECT * from candidate_answers;
ALTER TABLE candidate_answers ADD llm_comment TEXT;
ALTER TABLE candidate_answers CHANGE COLUMN question_id q_id INT;
TRUNCATE TABLE candidate_answers;

SELECT * from custom_roles;
SELECT * from custom_topics;
SELECT * from topic_role_mapping;



SHOW DATABASES;
CREATE DATABASE interview_practice_backup_1;
SHOW TABLES FROM interview_practice_backup_1;
USE interview_practice_backup_1;
From Command Prompt:
mysqldump -u root -p interview_practice > interview_practice.sql
mysql -u root -p interview_practice_backup_1 < interview_practice.sql
