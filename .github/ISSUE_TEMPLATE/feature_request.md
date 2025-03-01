---
name: Feature request
about: Suggest an idea for this project
title: ''
labels: ''
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.


- Heartbeat is set to 30 calls every 5 mins, no more as rate limiting issues will ensue [done] 
- We need to make sure the LLM is set to DeepSeek-R1, this is a free LLM service provided by the LLM framework [done]
- Create agent personality in @game-starter/src/agent file [done]
- Update worker for tweetworker and start new worker folder [done]
- Created Data directory to ensure it exists for storing tweets [done] 


todo: 
- Extend the functionality to respond to mentions or DMs
- Add storage of past tweets to avoid repetition
- Implement analytics to track engagement
- We have 30 tokens every 5 mins, and the bucket fills gradually so setting a pull mechansim on things versus always using a token would be a smart thing to do 


