FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY . .
RUN echo "server { listen 8866; location / { root /usr/share/nginx/html; index index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 8866
CMD ["nginx", "-g", "daemon off;"]
